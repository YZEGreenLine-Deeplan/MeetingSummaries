import { WebPartContext } from "@microsoft/sp-webpart-base";
import { SPHttpClientResponse, ISPHttpClientOptions, SPHttpClient } from "@microsoft/sp-http";
import axios from "axios";

export default class PAService {
    private _context: WebPartContext;
    public FLOW_URL: string;

    constructor(private context: WebPartContext, url: string) {
        this._context = this.context;
        this.FLOW_URL = url
    };

    private async getAccessToken(): Promise<string> {
        const body: ISPHttpClientOptions = {
            body: JSON.stringify({
                resource: "https://service.flow.microsoft.com/"
            })
        };

        const token: any = await this._context.spHttpClient.post(
            `${this._context.pageContext.web.absoluteUrl}/_api/SP.OAuth.Token/Acquire`,
            SPHttpClient.configurations.v1 as any,
            body
        );

        const tokenJson = await token.json();

        return tokenJson.access_token;
    };

    public async get() {
        const token = await this.getAccessToken();

        try {
            const { data } = await axios.get(this.FLOW_URL,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return Promise.resolve(data);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    public async post(body: any) {
        const token = await this.getAccessToken();

        try {
            const res = await axios.post(this.FLOW_URL, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            return Promise.resolve(res);
        } catch (err) {
            return Promise.reject(err);
        }
    }
}
