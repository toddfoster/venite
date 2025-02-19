import { Component, Prop, Watch, State, Host, Listen, Event, EventEmitter, JSX, Element, h } from '@stencil/core';
import { LiturgicalDocument, Liturgy, Meditation, BibleReading, Heading, Option, Psalm, Refrain, ResponsivePrayer, Rubric, Text, Image, LiturgicalColor, SelectableCitation, Responsive } from '@venite/ldf';
import { getComponentClosestLanguage } from '../../utils/locale';

import EN from './liturgical-document.i18n.en.json';
const LOCALE = {
  'en': EN
};

import { ConditionNode } from './condition-node';
import { LookupNode } from './lookup-node';

@Component({
  tag: 'ldf-liturgical-document',
  styleUrl: 'liturgical-document.scss',
  scoped: true
})
export class LiturgicalDocumentComponent {
  @Element() element: HTMLElement;

  // States
  @State() obj : LiturgicalDocument;
  @State() localeStrings: { [x: string]: string; };
  @State() hasFocus : boolean = false;

  buttonsSelected : boolean = false;
  interrupt : boolean = false;

  // Properties
  /**
   * An LDF LiturgicalDocument object.
   */
  @Prop() doc : LiturgicalDocument | string;
  @Watch('doc')
  async docChanged(newDoc : LiturgicalDocument | string) {
    let provisionalObj : LiturgicalDocument;

    try {
      if(typeof newDoc == 'string') {
        provisionalObj = new LiturgicalDocument(JSON.parse(newDoc));
      } else {
        provisionalObj = new LiturgicalDocument(newDoc);
      }
    } catch(e) {
      console.warn(e);
      provisionalObj = new LiturgicalDocument();
    }

    this.obj = provisionalObj || new LiturgicalDocument();
  }

  /** A JSON Pointer that points to the LiturgicalDocument being edited */
  @Prop({ reflect: true }) path : string;

  /** A JSON Pointer that points to the array within which the item is nested */
  @Prop({ reflect: true }) base: string;

  /** Index within a larger array, if any */
  @Prop() index : number;

  /** Type of the parent `LiturgicalDocument`, if any */
  @Prop({ reflect: true }) parentType : 'liturgy' | 'cycle' | 'heading' | 'option' | 'refrain' | 'rubric' | 'text' | 'responsive' | 'bible-reading' | 'psalm' | 'meditation' | null = null;

  /** Whether the object is editable */
  @Prop() editable : boolean;

  /** Documents in `preview` mode will display as if they're not editable, unless the user explicitly chooses to edit them */
  @Prop() preview : boolean = false;

  /** CSS padding to add around element, if any. */
  @Prop() padding : string | undefined = undefined;

  // Listeners
  @Listen("dragover", { passive: false })
  onDragOver() {
    if(this.path !== "/") {
      this.hasFocus = true;
      this.focusPath.emit(this.path);
      this.focusObj.emit({obj: this.obj, path: this.path});
      console.log("dragged over", this.path);
    }
  }

  // Events
  @Event() focusPath : EventEmitter<string>;
  @Event() focusObj : EventEmitter<{obj: LiturgicalDocument; path: string;}>;
  @Event() ldfSelectionChange : EventEmitter<{ target: HTMLElement; text: string; citation: SelectableCitation; fragment: string; }>;

  @Listen('selectionchange', { target: 'document' })
  selectionChangeHandler(ev : Event) {
    // stop iOS from taking over 
    ev.preventDefault();

    // handle the selection
    const selection = document.getSelection(),
      anchorNode = selection.anchorNode,
      citation = anchorNode?.parentElement?.closest('ldf-string')?.citation;
    if(this.element.contains(anchorNode)) {
      const text = selection.toString();
      this.ldfSelectionChange.emit({
        target: this.element,
        text,
        citation,
        fragment: this.path
      })
    }
  }

  // Lifecycle events
  componentWillLoad() {
    this.loadLocaleStrings();
    this.docChanged(this.doc);
  }

  /** On hover, display Add Block buttons */
  @Listen('mouseover', { capture: true })
  onMouseOver() {
    this.hasFocus = true;
    this.focusPath.emit(this.path);
  }

  @Listen('mouseout', { capture: true })
  onMouseOut(ev : MouseEvent) {
    const elDiv = this.element.querySelector('div.container');
    if(ev.relatedTarget == elDiv) {
      setTimeout(() => {
          this.hasFocus = false;
          this.focusPath.emit(this.path);
      }, 500);
    }
  }

  // Firing the event during the capture phase the most specific LiturgicalDocument will
  // be handled last, i.e., the `Liturgy` won't override subdocuments
  @Listen('click', { capture: true })
  onClick() {
    this.hasFocus = true;
    this.focusPath.emit(this.path);
    this.focusObj.emit({obj: this.obj, path: this.path});
  }

  async loadLocaleStrings() : Promise<void> {
    try {
      this.localeStrings = LOCALE[getComponentClosestLanguage(this.element)];
    } catch(e) {
      console.warn(e);
    }
  }

  /** Gives a loading view, a description of the document (if editing and has a lookup), or the component of the correct type */
  nodeFromDoc(doc : LiturgicalDocument, forceEditable : boolean | undefined = undefined) : JSX.Element {
    if(doc == undefined) {
      return customElements?.get('ion-skeleton-text') ? <ion-skeleton-text></ion-skeleton-text> : <p>...</p>
    } else if(this.editable || forceEditable) {
      return this.editableNode(doc);
    } else {
      return this.chooseComponent(doc);
    }
  }

  editableNode(doc : LiturgicalDocument) : JSX.Element {
    const localeStrings = this.localeStrings || {};

    if(doc.value?.length > 0 && Boolean(doc.value[0])) {
      if(doc.condition) {
        return <ConditionNode doc={doc} localeStrings={localeStrings}>
          {this.chooseComponent(doc)}
        </ConditionNode>;
      } else {
        return this.chooseComponent(doc);
      }
    } else {
      if(doc.condition && !doc.lookup) {
        return <ConditionNode doc={doc} localeStrings={localeStrings}>
          {this.chooseComponent(doc)}
        </ConditionNode>;
      } else if(doc.condition && doc.lookup) {
        return <ConditionNode doc={doc} localeStrings={localeStrings}>
          <LookupNode doc={doc} localeStrings={localeStrings}/>
        </ConditionNode>
      } else if(!doc.condition && doc.lookup) {
        return <LookupNode doc={doc} localeStrings={localeStrings}/>;
      } else if(doc.type === "bible-reading") {
        return <LookupNode doc={doc} localeStrings={localeStrings}/>;
      } else {
        return this.chooseComponent(doc);
      }
    }
  }

  /** Processes generic LiturgicalDocument into component of the appropriate type */
  //@Method()
  chooseComponent(doc : LiturgicalDocument) : JSX.Element {
    let node : JSX.Element;

    const editable = this.editable && !this.preview;

    switch(doc?.type) {
      case 'liturgy':
        node = <ldf-liturgy path={this.path} editable={editable} preview={this.preview} doc={doc as Liturgy}></ldf-liturgy>;
        break;
      case 'heading':
        node = <ldf-heading path={this.path} editable={editable} doc={doc as Heading}></ldf-heading>;
        break;
      case 'image':
        node = <ldf-image path={this.path} editable={editable} doc={doc as Image}></ldf-image>
        break;
      case 'meditation':
        const color = this.obj?.day?.color,
          colorValue = color?.hasOwnProperty('hex') ? (color as LiturgicalColor).hex : (color as string) || '#3489eb';
        node = <ldf-meditation path={this.path} editable={this.editable || this.preview} doc={doc as Meditation} color={colorValue}></ldf-meditation>;
        break;
      case 'option':
        node = <ldf-option path={this.path} editable={editable} preview={this.preview} doc={doc as Option}></ldf-option>;
        break;
      case 'refrain':
        node = <ldf-refrain path={this.path} editable={editable} doc={doc as Refrain}></ldf-refrain>;
        break;
      case 'rubric':
        node = <ldf-rubric path={this.path} editable={editable} doc={doc as Rubric}></ldf-rubric>;
        break;
      case 'text':
        node = <ldf-text path={this.path} editable={editable} doc={doc as Text}></ldf-text>
        break;
      case 'responsive':
        node = <ldf-responsive-prayer path={this.path} editable={editable} doc={doc as ResponsivePrayer}></ldf-responsive-prayer>
        break;
      case 'bible-reading':
        node = <ldf-bible-reading path={this.path} editable={editable} doc={doc as BibleReading}></ldf-bible-reading>
        break;
      case 'psalm':
        node = <ldf-psalm path={this.path} editable={editable} doc={doc as Psalm}></ldf-psalm>
        break;
      default:
        console.warn('invalid type for document', doc);
        break;
    }

    return node;
  }

  setPreview(preview: boolean) {
      this.preview = preview;
      this.editable = true;
  }

  // Render
  render() {
    const node = this.nodeFromDoc(this.obj);

    return (
      node && <Host lang={this.obj?.language || 'en'}>
        {/* Editable/Responsive Classes */}
        <div class={{
          container: true,
          editable: this.editable || this.preview,
          "small-only": !this.editable && !this.preview && this.obj?.responsive !== undefined && this.obj?.responsive == Responsive.SmallOnly,
          "small-hidden": !this.editable && !this.preview && this.obj?.responsive !== undefined && this.obj?.responsive == Responsive.SmallHidden,
        }}>
          {/* Settings/Delete/Edit Buttons */}
          {(this.editable || this.preview) && <ldf-editable-metadata-buttons
            visible={this.hasFocus}
            base={this.base}
            index={this.index}
            obj={this.obj}
            parentType={this.parentType}
            preview={this.preview}
            onLdfTogglePreview={(e : CustomEvent) => this.setPreview(e.detail)}
            class={{'top-level': this.obj?.type === 'liturgy' || this.obj?.type === 'option'}}
          >
          </ldf-editable-metadata-buttons>}

          {/* Responsive banner in editing mode */}
          {(this.editable || this.preview) && (this.obj?.responsive === Responsive.SmallHidden || this.obj?.responsive === Responsive.SmallOnly) && <ion-chip class="responsive-banner">
            <ion-icon name="phone-portrait-outline"></ion-icon>
            {this.obj?.responsive === Responsive.SmallOnly && <ion-label>{this.localeStrings.smallOnly}</ion-label>}
            {this.obj?.responsive === Responsive.SmallHidden && <ion-label>{this.localeStrings.smallHidden}</ion-label>}
          </ion-chip>}

          {/* Render the Document */}
          <div
            id={(this.path || '').replace(/\//g, '-')}
            class={{
              doc: true,
              editable: this.editable || this.preview
            }}
            style={{padding: this.padding}}
          >
            {node}
          </div>
        </div>
      </Host>
    );
  }
}
