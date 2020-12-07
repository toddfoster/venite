import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { EditorState } from '../editor/ldf-editor/editor-state';
import { EditorService } from '../editor/ldf-editor/editor.service';

@Component({
  selector: 'venite-template',
  templateUrl: './template.page.html',
  styleUrls: ['./template.page.scss'],
})
export class TemplatePage implements OnInit {
  docId$ : Observable<string>;
  state$ : Observable<EditorState>;

  constructor(
    private route : ActivatedRoute,
    private loading : LoadingController,
    private editorService : EditorService
  ) { }

  ngOnInit() {
    this.showLoading();

    this.docId$ = this.route.params.pipe(
      map(({ docId }) => docId)
    );

    this.state$ =  this.docId$.pipe(
      switchMap(docId =>this.editorService.editorState(docId))
    );
  }

  async showLoading() {
    const loading = await this.loading.create();
    await loading.present();
  }

}
