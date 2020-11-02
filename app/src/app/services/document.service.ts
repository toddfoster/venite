import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentChangeAction } from '@angular/fire/firestore';

import { Observable, from, of, combineLatest } from 'rxjs';
import { filter, map, startWith, switchMap, tap } from 'rxjs/operators';

import { docsToOption, LiturgicalColor, LiturgicalDocument, Liturgy, versionToString } from '@venite/ldf';
import { DTO } from './dto';
import { Organization } from '../organization/organization';
import * as firebase from 'firebase';
import { AuthService } from '../auth/auth.service';

// Include document ID and data
export interface IdAndDoc {
  id: string;
  data: LiturgicalDocument;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  constructor(
    private readonly afs: AngularFirestore,
    private auth : AuthService
  ) { }

  /** Returns an array of all the public documents that match each of the provided properties of `query` */
  // TODO -- returns empty array?
  find(query : Partial<LiturgicalDocument>) : Observable<LiturgicalDocument[]> {
    return this.afs.collection<LiturgicalDocument>('Document', ref => {
      let builtQuery = ref.where('sharing.status', '==', 'published').where('sharing.privacy', '==', 'public');
      Object.entries(query).forEach(([prop, value]) => {
        console.log('where ', prop, '==', value);
        builtQuery = builtQuery.where(prop, '==' , value);
      });
      return builtQuery;
    }).valueChanges();
  }

  getVersions(language : string, type : string) : Observable<{[key: string]: string}> {
    return this.afs.doc<{versions: {[key: string]: string}}>(`Versions/${language}-${type}`)
      .valueChanges()
      .pipe(
        map(doc => doc.versions)
      );
  }

  getLiturgyOptions(language : string, version : string) : Observable<Liturgy[]> {
    const veniteLiturgies$ = this.afs.collection<Liturgy>('Document', ref => 
      ref.where('type', '==', 'liturgy')
        .where('language', '==', language)
        .where('version', '==', version)
        .where('sharing.organization', '==', 'venite')
        .where('sharing.status', '==', 'published')
        .where('sharing.privacy', '==', 'public')
    ).valueChanges();

    const myLiturgies$ = this.auth.user.pipe(
      filter(user => Boolean(user?.uid)),
      switchMap(user => this.myDocuments(user?.uid)),
      map(idsAndDocs => idsAndDocs
        .map(idAndDoc => idAndDoc.data)
        .filter(doc => doc.type === 'liturgy' && !Boolean(doc.day)) as Liturgy[]
      ),
      startWith([] as Liturgy[])
    );

    return combineLatest([this.auth.user, myLiturgies$, veniteLiturgies$]).pipe(
      map(([user, mine, venite]) => user
        ? mine.concat(
          // filter out anything I own
          venite.filter(doc => doc?.sharing?.owner ? doc.sharing.owner !== user?.uid : true)
        )
        : mine.concat(venite)
      )
    )
  }

  getAllLiturgyOptions() : Observable<Liturgy[]> {
    return this.afs.collection<Liturgy>('Document', ref => 
      ref.where('type', '==', 'liturgy')
        .where('sharing.organization', '==', 'venite')
        .where('sharing.status', '==', 'published')
        .where('sharing.privacy', '==', 'public')
    ).valueChanges();
  }

  findOrganizationLiturgy(orgId : string, slug : string) : Observable<LiturgicalDocument[]> {
    return this.afs.collection<Liturgy>('Document', ref => 
      ref.where('slug', '==', slug)
        .where('sharing.organization', '==', orgId)
        .where('sharing.status', '==', 'published')
        .where('sharing.privacy', '==', 'public')
    ).valueChanges();
  }

  findDocumentById(docId : string) : Observable<LiturgicalDocument> {
    return this.afs.doc<LiturgicalDocument>(`Document/${docId}`).valueChanges();
  }

  findDocumentsBySlug(slug : string, language : string = 'en', versions : string[] = undefined) : Observable<LiturgicalDocument[]> {    
    const veniteLiturgies$ = this.afs.collection<LiturgicalDocument>('Document', ref => {
      let query = ref.where('slug', '==', slug)
                     .where('language', '==', language)
                     .where('sharing.organization', '==', 'venite')
                     .where('sharing.status', '==', 'published')
                     .where('sharing.privacy', '==', 'public');
      if(versions?.length > 0) {
        query = query.where('version', 'in', versions);
      }
      return query;
    }).valueChanges();

    const myDocs$ = this.auth.user.pipe(
      switchMap(user => {
        return this.afs.collection<LiturgicalDocument>('Document', ref => {
          let query = ref.where('slug', '==', slug)
            .where('language', '==', language)
            .where('sharing.owner', '==', user?.uid)
          if(versions?.length > 0) {
            query = query.where('version', 'in', versions);
          }
          return query;
        }).valueChanges()
      })
    );

    const gloriaQuery = slug !== 'gloria-patri' ? this.findDocumentsBySlug('gloria-patri', language, versions) : of([]);

    return combineLatest([this.auth.user, veniteLiturgies$, myDocs$, gloriaQuery]).pipe(
      map(([user, venite, mine, gloria]) => [
        user
        ? mine.concat(
          // filter out anything I own
          venite.filter(doc => doc?.sharing?.owner ? doc.sharing.owner !== user?.uid : true)
        )
        : mine.concat(venite),
        gloria
      ]),
      // add Gloria to psalms, canticles, invitatories
      map(([docs, gloria]) => docs.map(doc => doc.type !== 'psalm' ? doc : new LiturgicalDocument({
        ... doc,
        metadata: {
          ... doc.metadata,
          gloria: docsToOption(gloria)
        }
      }))),
      // order by version
      map(docs => docs.sort((a, b) => {
        const aIndex = (versions || []).indexOf(versionToString(a.version));
        const bIndex = (versions || []).indexOf(versionToString(b.version));
        return aIndex < bIndex ? -1 : 1;
      }))
    );
  }

  findDocumentsByCategory(category : string[], language : string = 'en', versions : string[] = undefined) : Observable<LiturgicalDocument[]> {
    return this.afs.collection<LiturgicalDocument>('Document', ref =>
      ref.where('category', 'array-contains-any', category)
         .where('language', '==', language)
         .where('sharing.organization', '==', 'venite')
         .where('sharing.status', '==', 'published')
         .where('sharing.privacy', '==', 'public')
    ).valueChanges().pipe(
      // filtered separately because Firestore doesn't allow mixing `array-contains-any` and `in` queries
      map(docs => {
        if(versions?.length > 0) {
          return docs.filter(doc => versions.includes(versionToString(doc.version)));
        } else {
          return docs;
        }
      })
    );
  }

  findDocuments() : Observable<IdAndDoc[]> {
    return this.afs.collection<LiturgicalDocument>('Document').snapshotChanges().pipe(
      // transform from AngularFire `DocumentChangeAction` to `doc`
      map(changeactions => changeactions.map(action => action?.payload?.doc)),
      // extra ID and document data and leave the rest behind
      map(docs => docs.map(doc => ({ id: doc.id, data: doc.data() })))
    );
  }

  /** All documents 'owned' by a user with `uid` */
  myLiturgies(uid : string) : Observable<IdAndDoc[]> {
    return this.afs.collection<LiturgicalDocument>('Document', ref =>
      ref.where('sharing.owner', '==', uid)
         .where('type', '==', 'liturgy')
    ).snapshotChanges().pipe(
      // transform from AngularFire `DocumentChangeAction` to `doc`
      map(changeactions => changeactions.map(action => action?.payload?.doc)),
      // extra ID and document data and leave the rest behind
      map(docs => docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })))
    );
  }

  myDocuments(uid : string) : Observable<IdAndDoc[]> {
    return this.afs.collection<LiturgicalDocument>('Document', ref =>
      ref.where('sharing.owner', '==', uid)
    ).snapshotChanges().pipe(
      // transform from AngularFire `DocumentChangeAction` to `doc`
      map(changeactions => changeactions.map(action => action?.payload?.doc)),
      // extra ID and document data and leave the rest behind
      map(docs => docs.map(doc => ({ id: doc.id, data: doc.data() })))
    );
  }

  myOrganizationDocuments(orgs : Organization[]) : Observable<IdAndDoc[]> {
    if(orgs?.length > 0) {
      return this.afs.collection<LiturgicalDocument>('Document', ref =>
        ref.where('sharing.organization', 'in', orgs.map(org => org.slug))
      ).snapshotChanges().pipe(
        // transform from AngularFire `DocumentChangeAction` to `doc`
        map(changeactions => changeactions.map(action => action?.payload?.doc)),
        // extra ID and document data and leave the rest behind
        map(docs => docs.map(doc => ({ id: doc.id, data: doc.data() })))
      );
    } else {
      return of([]);
    }
  }

  search(uid : string, search : string, orgs : Organization[]) : Observable<IdAndDoc[]> {
    return combineLatest([
      this.myDocuments(uid).pipe(startWith([])),
      of([])//this.myOrganizationDocuments(orgs).pipe(startWith([]))
    ]).pipe(
      map(([docs, orgDocs]) => docs.concat(orgDocs).filter(doc => JSON.stringify({ ... doc }).includes(search)))
    );
  }

  async newDocument(doc : LiturgicalDocument) : Promise<string> {
    const docId = this.afs.createId();
    await this.afs.collection('Document').doc(docId).set({
      ... JSON.parse(JSON.stringify(doc)),
      date_created: firebase.firestore.Timestamp.now(),
      date_modified: firebase.firestore.Timestamp.now()
    });
    return docId;
  }

  saveDocument(docId : string, doc : Partial<DTO<LiturgicalDocument>>) : Observable<any> {
    return from(this.afs.doc(`Document/${docId}`).set({
      ... JSON.parse(JSON.stringify({ ... doc, slug : doc.slug || this.slugify(doc)})),
      date_modified: firebase.firestore.Timestamp.now()
    }));
  }

  deleteDocument(docId : string) : Promise<void> {
    return this.afs.collection('Document').doc(docId).delete();
  }

  slugify(doc : Partial<DTO<LiturgicalDocument>>) : string {
    return doc.label?.replace(/\s/g, '-').toLowerCase();
  }

  getColor(color : string | LiturgicalColor | null) : Observable<string> {
    if(color) {
      if(typeof color !== 'string') {
        return of(color.hex);
      } else {
        return this.afs.collection<LiturgicalColor>('Color', ref =>
          ref.where('name', '==', color)
        ).valueChanges().pipe(
          map(colors => colors.length > 0 ? colors[0].hex : color)
        );
      }
    } else {
      return of('var(--ldf-background-color)')
    }
  }
}
