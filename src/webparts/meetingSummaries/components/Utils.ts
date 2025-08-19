import { v4 as uuidv4 } from 'uuid';
import { BaseEntity, Entity, SchemaType, Task } from './Interfaces';
import styles from './MeetingSummaries.module.scss';
import Swal from 'sweetalert2'
import { blue, red } from '@mui/material/colors';
import moment, { Moment } from 'moment';
import { SPFI } from '@pnp/sp';
import PAService from '../services/powerAutomate.srv';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IAttachment } from './Interfaces';

const customClass = {
    title: styles.swal2Title,
    htmlContainer: styles.swal2Content,
    confirmButton: styles.swal2Confirm,
    cancelButton: styles.swal2Cancel
}

const meetingRoomsListUrl = 'https://yzengcoil.sharepoint.com/sites/YZE-MsTasks/Lists/MeetingSummaries/AllItems.aspx'

export const defaultFactory = <T>(type: SchemaType): Partial<T> => {
    const templates: Record<SchemaType, Partial<any>> = {
        Task: {
            company: '',
            department: '',
            name: '',
            designation: '',
            subject: '',
            startDate: '',
            endDate: '',
            importance: '',
            description: '',
            attachments: [],
            locked: true,
            grantUsersPermissions: [],
            grantUsersPermissionsIds: []
        },
        Employee: {
            name: '',
            company: '',
            designation: '',
        },
        MeetingContent: {
            description: '',
            name: '',
            dueDate: '',
            status: ''
        },

    };

    return templates[type] as Partial<T>;
};

export const addRow = <T>(
    dataArrayName: string,
    type: SchemaType,
    setState: (updater: (prevState: any) => any) => void
): void => {
    const defaultRow = defaultFactory<T>(type);

    setState((prevState) => ({
        [dataArrayName]: [
            ...prevState[dataArrayName],
            {
                id: prevState[dataArrayName].length + 1, // Increment ID based on current length
                ...defaultRow,
                uid: uuidv4(), // Generate unique identifier
            },
        ],
    }));
};

export const deleteRow = <T extends BaseEntity>(
    dataArrayName: string,
    rowIndex: number,
    setState: (updater: (prevState: any) => any) => void
): void => {
    setState((prevState) => {
        const currentArray = prevState[dataArrayName] as T[];

        if (!currentArray || currentArray.length === 0 || rowIndex < 0 || rowIndex >= currentArray.length) {
            return prevState; // No changes if invalid index or empty array
        }

        const filteredArray = currentArray.filter((_, index) => index !== rowIndex);

        const reorderedList = filteredArray.map((item, index) => ({
            ...item,
            id: index + 1, // Reset IDs starting from 1
        }));

        return {
            [dataArrayName]: reorderedList,
        };
    });
};


export const reformatList = <T extends object>(
    list: T[],
    requiredFields: string[],
    additionalFieldsTransform?: (item: T) => Partial<T>
): (T & { id: number })[] => {
    return list
        .filter((item) =>
            requiredFields.some((field) => {
                const value = (item as any)[field];
                return value !== '' && value !== null && value !== undefined;
            })
        )
        .map((item, index) => {
            const transformedItem = {
                ...item,
                ...(additionalFieldsTransform ? additionalFieldsTransform(item) : {}),
                id: index + 1, // Assign sequential IDs
            };

            // Convert 'name' field from array to comma-separated string if it exists and is an array
            if (Array.isArray((item as any).name)) {
                (transformedItem as any).name = (item as any).name.join(', ');
            }

            return transformedItem;
        });
};

export const reformatListWithDates = <T extends object>(
    list: T[],
    dateFields: string[]
): (T & Record<string, any>)[] => {
    return list.map((item: any) => {
        const transformedItem: any = { ...item };

        dateFields.forEach((field) => {
            if (item[field]) {
                transformedItem[field] = moment(item[field]).toDate();
                transformedItem[`${field}Moment`] = moment(item[field]);
            } else {
                transformedItem[field] = null;
                transformedItem[`${field}Moment`] = null;
            }
        });

        return transformedItem;
    });
};


export const removingBlanks = <T extends object>(list: any[], requiredFields: string[]) => {
    return list
        .filter((item: T[]) => {
            // Check if at least one of the required fields is not empty/null
            return requiredFields.some((field) => {
                const value = (item as any)[field];
                return value !== '' && value !== null && value !== undefined;
            });
        })
}

export const initReformatList = <T extends object>(
    list: T[]
): (T & Record<string, any>)[] => {
    return list.map((item: any) => {
        // Convert the joined name field back to an array
        if (item.name && typeof item.name === 'string') {
            item.name = item.name.split(', ');
        }
        return item;
    });
};

export const initReformatListWithDates = <T extends object>(
    list: T[],
    dateFields: string[]
): (T & Record<string, any>)[] => {
    return list.map((item: any) => {
        const transformedItem: any = { ...item };

        dateFields.forEach((field) => {
            if (item[field]) {
                transformedItem[field] = moment(item[field]);
            } else {
                transformedItem[field] = null;
                transformedItem[`${field}Moment`] = null;
            }
        });

        return transformedItem;
    });
}

export const saveEntity = async (name: string, sp: SPFI, listId: string) => {
    try {
        await sp.web.lists.getById(listId).items.add({
            Title: name,
        });
    } catch (error) {
        console.error(`Error saving entity (${name}):`, error);
    }
};

export const saveEntities = async (
    entities: Entity[],
    sp: SPFI,
    listId: string,
    key: keyof Entity,
    ...arrays: Entity[][]
): Promise<void> => {

    const combinedNames = new Set<string>(
        arrays
            .reduce((acc, array) => acc.concat(array), []) // Flatten all arrays into a single array
            .map((item: Entity) => item[key] as string)
            .filter((value: string) => value) // Filter out falsy values
    );
    let entitiesToSave: any[] = []
    if (key === 'company') {
        entitiesToSave = Array.from(new Set(combinedNames)).flat().filter(
            (value: string) => !entities.find((entity: Entity) => entity === value)
        );
    }
    else if (key === 'name') {
        entitiesToSave = Array.from(new Set(combinedNames)).flat().filter(
            (value: string) => !entities.find((entity: Entity) => entity.Title === value)
        );
    }

    if (entitiesToSave.length > 0) {
        try {
            await Promise.all(entitiesToSave.map((value: string) => saveEntity(value, sp, listId)));
        } catch (error) {
            console.error(`Error saving new ${key}s:`, error);
        }
    }
};


export const confirmSaveAndSend = async (options: any) => {

    const {
        onConfirm,
        onCancel,
        currDir
    } = options;

    const t = currDir ? require('../../../locales/he/common.json') : require('../../../locales/en/common.json') // Translator between en/he

    return Swal.fire({
        title: t.titleSaveAndSend,
        icon: "warning",
        text: t.textSaveAndSend,
        confirmButtonText: t.confirmButtonTextSaveAndSend,
        confirmButtonColor: blue.A400,
        cancelButtonText: t.No,
        cancelButtonColor: red.A700,
        showCancelButton: true,
        customClass: customClass,
        backdrop: false,
        returnFocus: false
    }).then(async (result) => {
        if (result.isConfirmed) {
            if (onConfirm) {
                await onConfirm(); // Execute the confirm callback
                window.location.href = meetingRoomsListUrl;
            }
        } else {
            if (onCancel) {
                onCancel(); // Execute the cancel callback
            }
        }
        return result.isConfirmed;
    });
};


export const sweetAlertMsgHandler = (status: string, currDir: boolean): void => {

    const t = currDir ? require('../../../locales/he/common.json') : require('../../../locales/en/common.json') // Translator between en/he

    if (status === "Submit") {
        Swal.fire({
            title: t.swalTitleSubmit,
            icon: "success",
            confirmButtonColor: blue.A400,
            customClass: customClass,
            willClose: () => {
                window.location.href = meetingRoomsListUrl;
            }
        }).then((confirmation) => {
            if (confirmation.isConfirmed) {
                window.location.href = meetingRoomsListUrl
            }
        })
    }

    if (status === 'send') {
        Swal.fire({
            title: "Save & Send - Are You Sure?",
            icon: "warning",
            text: "This action is irreversible. Once saved and sent, you cannot undo the changes.",
            confirmButtonText: t.Yes,
            confirmButtonColor: blue.A400,
            cancelButtonText: t.No,
            cancelButtonColor: red.A700,
            customClass: customClass,
            showCancelButton: true,
            backdrop: false,
            returnFocus: false,
            willClose: () => {
                window.location.href = meetingRoomsListUrl;
            }
        }).then((confirmation) => {
            if (confirmation.isConfirmed) {
                window.location.href = meetingRoomsListUrl;
            }
        });
    }


    if (status === 'Cancel') {
        Swal.fire({
            title: t.swalCancel,
            text: t.swalTextCancel,
            icon: "warning",
            confirmButtonText: t.Yes,
            confirmButtonColor: blue.A400,
            cancelButtonText: t.No,
            cancelButtonColor: red.A700,
            customClass: customClass,
            showCancelButton: true,
            backdrop: false,
            returnFocus: false
        }).then((confirmation) => {
            if (confirmation.isConfirmed) {
                window.location.href = meetingRoomsListUrl;
            }
        });
    }
}





export const handleAttachmentChange = (value: IAttachment[], setState: React.Dispatch<React.SetStateAction<any>>) => {
    setState((prev: any) => ({
        ...prev,
        Attachments: value
    }));
}

export const addAttachments = async (itemId: number, listId: string, attachments: IAttachment[], sp: SPFI): Promise<void> => {
    const item = sp.web.lists.getById(listId).items.getById(itemId);
    for (const attachment of attachments) {
        try {
            await item.attachmentFiles.add(attachment.FileName, attachment.content as Blob | ArrayBuffer | string);
        } catch (error) {
            throw new Error(`Failed to add item attachment ${attachment.FileName} to item ${itemId} in list ${listId}: ${String(error)}`);
        }
    }
}

export const getAttachments = async (itemId: number, listId: string, sp: SPFI): Promise<IAttachment[]> => {
    try {
        const item = sp.web.lists.getById(listId).items.getById(itemId) as any;
        return await item.attachmentFiles();
    } catch (error) {
        throw new Error(`Failed to retrieve attachments for item ${itemId} in list ${listId}: ${String(error)}`);
    }
}

export const deleteAttachments = async (itemId: number, attachments: IAttachment[], listId: string, sp: SPFI): Promise<void> => {
    const item = sp.web.lists.getById(listId).items.getById(itemId) as any;
    for (const attachment of attachments) {
        let fileName = attachment.FileName
        try {
            await item.attachmentFiles.getByName(fileName).recycle()
        } catch (error) {
            throw new Error(`Failed to recycle item attachment ${fileName} to item ${itemId} in list ${listId}: ${String(error)}`);
        }
    }
}

export const getAuthUsers = async (context: WebPartContext): Promise<number[]> => {
    const pa = new PAService(context, 'https://defaulta7bb05389a624bbea7a5af184af71f.39.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/169e815611ad4351961553ed3975b811/triggers/manual/paths/invoke/?api-version=1')
    type User = {
        Email: string;
        Id: number;
        LoginName: string;
        Title: string;
        __metadata: {}
    }
    try {
        const res = await pa.post({
            groupsId: 3
        })
        if (res.status === 200) {
            return res.data.d.results.map((user: User) => user.Id)
        }
    } catch (error) {
        console.error('Error in power automate flow', error)
    }
    return []
}

export const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    
    // First, replace common HTML entities
    let text = html
        .replace(/&nbsp;/g, ' ') // Convert &nbsp; to spaces
        .replace(/&amp;/g, '&') // Convert &amp; to &
        .replace(/&lt;/g, '<') // Convert &lt; to <
        .replace(/&gt;/g, '>') // Convert &gt; to >
        .replace(/&quot;/g, '"') // Convert &quot; to "
        .replace(/&#39;/g, "'") // Convert &#39; to '
        .replace(/&apos;/g, "'"); // Convert &apos; to '
    
    // Replace block-level elements with newlines to preserve line breaks
    text = text
        .replace(/<\/?(p|div|h[1-6]|ol|ul|li|br)[^>]*>/gi, '\n') // Replace block elements with newlines
        .replace(/<\/?(strong|b|em|i|u|s|span)[^>]*>/gi, ''); // Remove inline formatting tags
    
    // Remove any remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');
    
    // Clean up whitespace and normalize line breaks
    text = text
        .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim(); // Remove leading/trailing whitespace
    
    return text;
}

