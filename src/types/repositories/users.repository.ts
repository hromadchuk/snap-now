export interface IUsersRepository {
    _id: number;
    firstVisit: Date;
    lastVisit: Date;
    firstName: string;
    lastName?: string;
    visits: number;
    languageCode?: string;
    photoUrl?: string;
    username?: string;
    photosCount: number;
}
