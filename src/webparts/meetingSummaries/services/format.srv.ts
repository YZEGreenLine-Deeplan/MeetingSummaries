import { IAttachment } from "../components/Interfaces";

export class FormatService {

    static formatAttachments(attachments: IAttachment[]): IAttachment[] {
        return attachments.filter(attachment => attachment.ServerRelativeUrl === '')
    }

    static filterAttachments(attachmentsSP: IAttachment[], localAttachments: IAttachment[]): IAttachment[] {
        return attachmentsSP.filter(attachmentSP => !localAttachments.some(deleted => deleted.ServerRelativeUrl === attachmentSP.ServerRelativeUrl))
    }
}
