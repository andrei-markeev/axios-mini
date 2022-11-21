import http, { ClientRequestArgs, IncomingHttpHeaders, Agent } from "http";
import https from "https";
import { Stream } from "stream";
import { createBrotliDecompress, createDeflate, createGunzip } from "zlib";

export interface AxiosOptions {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: { [key: string]: string };
    body?: Object | string;
    followredirect?: boolean;
    agent?: Agent;
    responseType?: "arraybuffer" | "stream";
}

export interface AxiosResponse<T> {
    status: number,
    statusText?: string,
    headers: IncomingHttpHeaders,
    data: T
}

export default function axios<T>(url: string, options: AxiosOptions = {}): Promise<AxiosResponse<T>> {
    return new Promise((resolve, reject) => {
        const client = url.indexOf("https://") === 0 ? https : http;
        const parsedUrl = new URL(url);

        const method = options.method || "GET";
        const headers = options.headers || {};

        const body = Buffer.isBuffer(options.body) || typeof options.body === "string" ? options.body : JSON.stringify(options.body);

        const clientOptions: ClientRequestArgs = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            port: parsedUrl.port,
            method,
            headers,
            agent: options.agent
        };

        console.log(`${method} ${url}`);

        const req = client.request(clientOptions, res => {
            if (res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                res.headers.location &&
                options.followredirect !== false) {
                return resolve(axios(res.headers.location, options));
            }

            let stream: Stream = res;
            if (res.headers["content-encoding"] === "gzip")
                stream = res.pipe(createGunzip());
            else if (res.headers["content-encoding"] === "deflate")
                stream = res.pipe(createDeflate());
            else if (res.headers["content-encoding"] === "br")
                stream = res.pipe(createBrotliDecompress());

            if (options.responseType === "stream")
                return resolve({
                    headers: res.headers,
                    status: res.statusCode || 0,
                    statusText: res.statusMessage,
                    data: stream as any
                });

            let chunks: Buffer[] = [];
            stream.on("data", data => {
                chunks.push(data);
            });

            stream.on("end", () => {
                const buffer = Buffer.concat(chunks);
                let data: T;
                if (options.responseType === "arraybuffer")
                    data = buffer as T;
                else {
                    const resBody = buffer.toString("utf8");
                    data = (res.headers["content-type"] || "").startsWith("application/json") ? JSON.parse(resBody) : resBody;
                }
                resolve({
                    headers: res.headers,
                    status: res.statusCode || 0,
                    statusText: res.statusMessage,
                    data
                })
            });

            stream.on("error", err => reject(err));
        });

        headers["accept"] || req.setHeader("accept", "*/*");

        headers["content-type"] ||
            req.setHeader(
                "content-type",
                body && !Buffer.isBuffer(body)
                    ? "application/json"
                    : "application/octet-stream"
            );

        body && req.setHeader("content-length", Buffer.byteLength(body, "utf-8"));
        body && req.write(body);
        req.on("error", err => reject(err)).end();
    });
}

axios.get = axios;
axios.post = <T>(url: string, body: AxiosOptions["body"], options: AxiosOptions) => axios<T>(url, { ...options, body, method: "POST" });
axios.put = <T>(url: string, body: AxiosOptions["body"], options: AxiosOptions) => axios<T>(url, { ...options, body, method: "PUT" });
axios.delete = <T>(url: string, options: AxiosOptions) => axios<T>(url, { ...options, method: "DELETE" });
axios.getStream = (url: string, options: AxiosOptions) => axios<Stream>(url, { ...options, responseType: "stream" });
axios.getBuffer = (url: string, options: AxiosOptions) => axios<Buffer>(url, { ...options, responseType: "arraybuffer" });