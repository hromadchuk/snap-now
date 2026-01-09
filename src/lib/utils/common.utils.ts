export type MatchKeys<Requests, Responses extends Record<keyof Requests, unknown>> = Responses;

export const BOT_USERNAME = 'snap_now_bot';

export const DEVELOPER_USERNAME = 'emigrant';

export const isDev = process.env.NODE_ENV === 'development';

export const DEV_CHAT = isDev ? -5033155318 : -5078948435;
