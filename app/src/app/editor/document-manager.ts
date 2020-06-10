import { User, Cursor, LiturgicalDocument, Change } from '@venite/ldf';
import * as Automerge from 'automerge';
import * as json1 from 'ot-json1';

export class DocumentManagerChange {
    actorId : string;
    uid : string;
    lastRevision : number;
    op : json1.JSONOp;
}

export class ServerDocumentManager {
    docId : string;
    users?: {
        [uid: string]: User;
    } 
    cursors?: {
        [uid: string]: Cursor;
    };
    lastRevision : number = 0;
    //pendingChanges: DocumentManagerChange[];
    revisionLog?: DocumentManagerChange[];
}

export class LocalDocumentManager {
    hasBeenAcknowledged: boolean = true;
    lastSyncedRevision: number = 0;
    sentChanges: DocumentManagerChange[] = new Array();
    pendingChanges: DocumentManagerChange[] = new Array();
    rejectedChanges: DocumentManagerChange[] = new Array();
    document : LiturgicalDocument;

    constructor(public docId : string) { }
}

// get(/databases/$(database)/documents/DocumentManager/$(request.resource.data.docId)).data.