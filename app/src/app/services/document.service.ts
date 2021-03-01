import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentChangeAction } from '@angular/fire/firestore';

import { Observable, from, of, combineLatest, merge, concat } from 'rxjs';
import { catchError, filter, map, startWith, switchMap, take, tap } from 'rxjs/operators';

import { docsToOption, LiturgicalColor, LiturgicalDocument, Liturgy, versionToString, Text } from '@venite/ldf';
import { DTO } from './dto';
import { Organization } from '../organization/organization';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { AuthService } from '../auth/auth.service';
import { OrganizationService } from '../organization/organization.service';

import BY_SLUG from '../../offline/by_slug.json';
import BY_CATEGORY from '../../offline/by_category.json';
import COLORS from '../../offline/colors.json';
import VERSIONS from '../../offline/versions.json';
import { HttpClient } from '@angular/common/http';
import { isOnline } from '../editor/ldf-editor/is-online';

// Include document ID and data
export interface IdAndDoc {
  id: string;
  data: LiturgicalDocument;
}

const LOADING = new Text({
  type: 'text',
  style: 'text',
  value: ['Loading...']
});

const ERROR = new Text({
  type: 'text',
  style: 'text',
  display_format: 'unison',
  value: ['*An error has occurred while trying to load part of this liturgy. It has been logged automatically. Sorry for the inconvenience!*']
})

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  _cache : Record<string, Promise<LiturgicalDocument[]>> = {};

  constructor(
    private readonly afs: AngularFirestore,
    private auth : AuthService,
    private organizationService : OrganizationService,
    private http : HttpClient
  ) { }

  handleError(error : any) {
    this.logError(error);
    return of([ERROR]);
  }

  // TODO
  logError(error : any) {
    console.warn('Caught Error', error);
  }

  /** Returns an array of all the public documents that match each of the provided properties of `query` */
  find(query : Partial<LiturgicalDocument>) : Observable<LiturgicalDocument[]> {
    return this.afs.collection<LiturgicalDocument>('Document', ref => {
      let builtQuery = ref.where('sharing.status', '==', 'published').where('sharing.privacy', '==', 'public');
      Object.entries(query).forEach(([prop, value]) => {
        //console.log('where ', prop, '==', value);
        builtQuery = builtQuery.where(prop, '==' , value);
      });
      return builtQuery;
    }).valueChanges();
  }

  getVersions(language : string, type : string) : Observable<{[key: string]: string}> {
    return of(VERSIONS[`${language}-${type}`]?.versions);
    // removed to enable offline mode and cut down on reads
    /*return this.afs.doc<{versions: {[key: string]: string}}>(`Versions/${language}-${type}`)
      .valueChanges()
      .pipe(
        map(doc => doc.versions)
      );*/
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
        .map(idAndDoc => new Liturgy(idAndDoc.data))
        .filter(doc => doc.type === 'liturgy' && !Boolean(doc.day) && doc.version === version) as Liturgy[]
      ),
      startWith([] as Liturgy[])
    );

    const myOrganizationLiturgies$ = this.auth.user.pipe(
      filter(user => Boolean(user?.uid)),
      switchMap(user => combineLatest([this.organizationService.organizationsWithEditor(user?.uid), this.organizationService.organizationsWithOwner(user?.uid)])),
      map(([editorOrgs, ownerOrgs]) => editorOrgs.concat(ownerOrgs)),
      switchMap(orgs => this.myOrganizationDocuments(orgs)),
      map(idsAndDocs => idsAndDocs
        .map(idAndDoc => new Liturgy(idAndDoc.data))
        .filter(doc => doc.type === 'liturgy' && !Boolean(doc.day)) as Liturgy[]
      ),
      startWith([] as Liturgy[])
    );

    const onlineLiturgies$ = combineLatest([this.auth.user, myLiturgies$, myOrganizationLiturgies$, veniteLiturgies$]).pipe(
      map(([user, mine, organization, venite]) => user
        ? mine
          .concat(
            organization.filter(doc => doc?.sharing?.owner ? doc.sharing.owner !== user?.uid : true)
          )
          .concat(
            // filter out anything I own
            venite.filter(doc => doc?.sharing?.owner ? doc.sharing.owner !== user?.uid : true)
          )
        : mine.concat(venite)
      ),
      map(docs => docs.map(doc => new Liturgy({...doc, id: undefined})))
    );

    // load from JSON for quicker load + offline access (but won't include your/org liturgies)
    const loadLiturgy = (language : string, version : string, slug : string) => this.http.get<Liturgy>(`/offline/liturgy/${language}-${version}-${slug}.ldf.json`)
    const offlineLiturgies$ = combineLatest([
      loadLiturgy('en', 'Rite-II', 'morning-prayer'),
      loadLiturgy('en', 'Rite-II', 'noonday-prayer'),
      loadLiturgy('en', 'Rite-II', 'evening-prayer'),
      loadLiturgy('en', 'Rite-II', 'compline'),
      loadLiturgy('en', 'Rite-I', 'morning-prayer'),
      loadLiturgy('en', 'Rite-I', 'evening-prayer'),
      loadLiturgy('en', 'EOW', 'morning-prayer'),
      loadLiturgy('en', 'EOW', 'evening-prayer'),
    ]);

    return concat(
      // first, load JSON liturgies
      offlineLiturgies$,
      // then, load from DB, but only if online
      isOnline().pipe(
        filter(online => Boolean(online)),
        switchMap(() => onlineLiturgies$)
      )
    );
  }

  getAllLiturgyOptions() : Observable<Liturgy[]> {
    return this.afs.collection<Liturgy>('Document', ref => 
      ref.where('type', '==', 'liturgy')
        .where('sharing.organization', '==', 'venite')
        .where('sharing.status', '==', 'published')
        .where('sharing.privacy', '==', 'public')
    ).valueChanges();
  }

  findOrganizationLiturgy(orgId : string, slug : string | undefined = undefined) : Observable<LiturgicalDocument[]> {
    return this.afs.collection<Liturgy>('Document', ref => {
      const query = ref.where('sharing.organization', '==', orgId)
        .where('sharing.status', '==', 'published')
        .where('sharing.privacy', '==', 'public');
      if(slug) {
        return query.where('slug', '==', slug);
      } else {
        return query;
      }
    }).valueChanges();
  }

  findDocumentById(docId : string) : Observable<LiturgicalDocument> {
    return this.afs.doc<LiturgicalDocument>(`Document/${docId}`).valueChanges();
  }

  findDocumentsBySlug(slug : string, language : string = 'en', rawVersions : string[] = undefined, disableOffline : boolean = false, bulletinMode : boolean = false) : Observable<LiturgicalDocument[]> {    
    // deduplicate versions -- max of 10 (for Firebase query)
    const uniqueVersions = Array.from(new Set(rawVersions?.length == 0 ? ['bcp1979'] : rawVersions)),
    versions = uniqueVersions?.length <= 10 ? uniqueVersions : uniqueVersions.slice(0, 10);
    
    // first, try JSON database
    if(!disableOffline) {
      if(['morning-prayer', 'noonday-prayer', 'evening-prayer', 'compline'].includes(slug)) {
        const key = `/offline/liturgy/${language}-${rawVersions[0]}-${slug}.ldf.json`;
        if(!this._cache[key]) {
          this._cache[key] = this.http.get<LiturgicalDocument>(key).pipe(
            map(doc => [doc]),
            catchError(() => this.findDocumentsBySlug(slug, language, rawVersions, true))
          ).toPromise();
        }
        return from(this._cache[key]);
      } else {
        const attempt = versions.map(version => BY_SLUG[`${language}-${version}-${slug}`])
          .flat()
          .filter(doc => Boolean(doc));
        // TODO need to include Firebase ones AS WELL, in case I have my own with same slug
        if(attempt?.length > 0) {
          // also send Firebase version, if online and in bulletin mode
          const firebaseVersions$ = isOnline().pipe(
            filter(online => online && bulletinMode),
            switchMap(() => this.findDocumentsBySlug(slug, language, rawVersions, true))
          );
          return merge(of(attempt), firebaseVersions$);
        } else {
          return this.findDocumentsBySlug(slug, language, rawVersions, true);
        }
      }
    }

    else {      
      if(uniqueVersions?.length > 10) {
        console.warn('(DocumentService) (findDocumentsBySlug) Firebase can only handle up to 10 unique versions to search. You searched for ', rawVersions);
      }

      const veniteLiturgies$ = this.afs.collection<LiturgicalDocument>('Document', ref => {
        let query = ref.where('slug', '==', slug)
                      .where('language', '==', language)
                      .where('sharing.organization', '==', 'venite')
                      .where('sharing.status', '==', 'published')
                      .where('sharing.privacy', '==', 'public');
        
        if(versions?.length > 0) {
          query = query.where('version', 'in', versions.filter(v => Boolean(v)));
        }
        return query;
      }).valueChanges();

      const myDocs$ = this.auth.user.pipe(
        switchMap(user => {
          if(user?.uid) {
            return this.afs.collection<LiturgicalDocument>('Document', ref => {
              let query = ref.where('slug', '==', slug)
                .where('language', '==', language)
                .where('sharing.owner', '==', user?.uid || '')
              if(versions?.length > 0) {
                query = query.where('version', 'in', versions.filter(v => Boolean(v)));
              }
              return query;
            }).valueChanges()
          } else {
            return of([]);
          }
        })
      );

      const myOrganizationLiturgies$ = this.auth.user.pipe(
        filter(user => Boolean(user?.uid)),
        switchMap(user => combineLatest([this.organizationService.organizationsWithEditor(user?.uid), this.organizationService.organizationsWithOwner(user?.uid)])),
        map(([editorOrgs, ownerOrgs]) => editorOrgs.concat(ownerOrgs)),
        switchMap(orgs => {
          if(orgs?.length > 0) {
            return this.afs.collection<LiturgicalDocument>('Document', ref =>
              ref.where('sharing.organization', 'in', orgs.map(org => org.slug))
                .where('slug', '==', slug)
                .where('language', '==', language)
            ).valueChanges().pipe(
              map(docs => versions?.length > 0
                ? docs.filter(doc => versions.includes(versionToString(doc.version)))
                : docs
              )
            );
          } else {
            return of([]);
          }
        }),
        filter(orgDocs => orgDocs?.length > 0),
        startWith([])
      );

      const gloriaQuery = slug !== 'gloria-patri' ? this.findDocumentsBySlug('gloria-patri', language, versions) : of([]);

      return combineLatest([this.auth.user, veniteLiturgies$, myDocs$, myOrganizationLiturgies$, gloriaQuery]).pipe(
        map(([user, venite, mine, org, gloria]) => [
          user
          ? mine.concat(org).concat(
            // filter out anything I own
            venite.filter(doc => doc?.sharing?.owner ? doc.sharing.owner !== user?.uid : true)
          )
          : mine.concat(venite),
          gloria
        ]),
        // add Gloria to psalms, canticles, invitatories, if they don't have 
        map(([docs, gloria]) => docs.map(doc => doc.type !== 'psalm'
          ? doc
          : new LiturgicalDocument({
            ... doc,
            metadata: {
              ... doc.metadata,
              gloria: docsToOption(gloria)
            }
          }))
        ),
        // order by version
        map(docs => docs.sort((a, b) => {
          const aIndex = (versions || []).indexOf(versionToString(a.version));
          const bIndex = (versions || []).indexOf(versionToString(b.version));
          return aIndex < bIndex ? -1 : 1;
        })),
        switchMap(docs => docs.length === 0 && !versions.includes('bcp1979')
          ? this.findDocumentsBySlug(slug, language, versions.concat('bcp1979'))
          : of(docs)
        ),
        startWith([LOADING]),
        catchError((error) => this.handleError(error)),
      );
    }
  }

  findDocumentsByCategory(category : string[], language : string = 'en', versions : string[] = undefined, disableOffline : boolean = false, bulletinMode : boolean = false) : Observable<LiturgicalDocument[]> {
    if(!disableOffline) {
      const attempt = Array.from(new Set(versions)).map(version => BY_CATEGORY[`${language}-${version}`])
        .flat()
        .filter(doc => (doc?.category || []).some(r => category.indexOf(r) >= 0));
      // TODO need to include Firebase ones AS WELL, in case I have my own with same category
      if(attempt?.length > 0) {
        // also send Firebase version, if online and in bulletin mode
        const firebaseVersions$ = isOnline().pipe(
          filter(online => online && bulletinMode),
          switchMap(() => this.findDocumentsByCategory(category, language, versions, true))
        );
        return merge(of(attempt), firebaseVersions$);
      } else {
        return this.findDocumentsByCategory(category, language, versions, true);
      }
    } else {
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
      }),
      map(docs => docs.sort((a, b) => a.label > b.label ? 1 : -1)),
      startWith([LOADING]),
      catchError((error) => this.handleError(error))
    );
    }
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

  myOrganizationDocumentsWithSlug(org : string, slug : string) : Observable<IdAndDoc[]> {
    return this.afs.collection<LiturgicalDocument>('Document', ref =>
      ref.where('sharing.organization', '==', org)
         .where('slug', '==', slug)
    ).snapshotChanges().pipe(
      // transform from AngularFire `DocumentChangeAction` to `doc`
      map(changeactions => changeactions.map(action => action?.payload?.doc)),
      // extra ID and document data and leave the rest behind
      map(docs => docs.map(doc => ({ id: doc.id, data: doc.data() }))),
    );
  }

  myOrgDocExists(org : string, uid : string, slug : string) : Observable<boolean> {
    const veniteDocs$ = this.afs.collection<LiturgicalDocument>('Document', ref =>
      ref.where('sharing.organization', '==', 'venite')
         .where('sharing.status', '==', 'published')
         .where('sharing.privacy', '==', 'public')
         .where('slug', '==', slug)
    ).valueChanges();

    const myDocs$ = this.afs.collection<LiturgicalDocument>('Document', ref =>
      ref.where('sharing.owner', '==', uid)
         .where('slug', '==', slug)
    ).valueChanges();
    
    return combineLatest([veniteDocs$, myDocs$]).pipe(
      map(([veniteDocs, myDocs]) => veniteDocs.concat(myDocs).length > 0)
    );
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
      id: docId,
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
        const colorValue = COLORS[color.toLowerCase()];
        return of(colorValue?.hex || color);
        // COLORS switched to offline mode
        /*return this.afs.collection<LiturgicalColor>('Color', ref =>
          ref.where('name', '==', color.toLowerCase())
        ).valueChanges().pipe(
          map(colors => colors.length > 0 ? colors[0].hex : color)
        );*/
      }
    } else {
      return of('var(--ldf-background-color)')
    }
  }

  getColors() : Observable<LiturgicalColor[]> {
    return this.afs.collection<LiturgicalColor>('Color').valueChanges();
  }
}
