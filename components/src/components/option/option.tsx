import { Component, Prop, Watch, State, Listen, Method, Host, JSX, Event, EventEmitter, h } from '@stencil/core';
import { Option, LiturgicalDocument } from '@venite/ldf';
import { AddOptionToDoc } from '../../interfaces/add-option-to-doc';

@Component({
  tag: 'ldf-option',
//  styleUrl: 'option.scss',
  shadow: true
})
export class OptionComponent {
  // States
  @State() obj : Option;
  @State() selectedDoc : LiturgicalDocument;

  // Properties
  /**
   * An LDF Option object.
   */
  @Prop() doc : Option | string;
  @Watch('doc')
  docChanged(newDoc : Option | string) {
    try {
      if(typeof newDoc == 'string') {
        this.obj = new Option(JSON.parse(newDoc));
      } else {
        this.obj = new Option(newDoc);
      }
    } catch(e) {
      console.warn(e);
      this.obj = new Option();
    }
  }

  /**
   * A JSON Pointer that points to the Option being edited
   */
  @Prop({ reflect: true }) path : string;

  /**
   * Whether the object is editable
   */
  @Prop() editable : boolean;

  // Events
  @Event() ldfAddOptionToDoc : EventEmitter<AddOptionToDoc>;

  // Lifecycle events
  componentWillLoad() {
    this.docChanged(this.doc);

    const selected : number = this.obj.metadata && this.obj.metadata.selected ? this.obj.metadata.selected : 0;
    console.log('selected', this.obj.metadata, selected);
    this.select(selected || 0);
  }

  /** Display the nth option */
  @Method()
  async select(index : number | 'add') {
    console.log('select ', index);
    if(Number(index) >= 0) {
      this.selectedDoc = this.obj.value[index];
      // sets metadata.selected to new index, and creates objects along the way if undefined
      // without overriding any other metadata fields
      Object.assign(this.obj, { metadata: { ...this.obj.metadata, selected: index }});
    } else {
      this.ldfAddOptionToDoc.emit({
        base: this.path,
        index: this.obj?.value?.length,
        obj: this.obj
      })
    }
  }

  // Listener for Ionic Select and Segment change events
  @Listen('ionChange')
  onIonChange(ev) {
    this.select(ev.detail.value);
  }

  // Private methods
  onSelectChange(ev : Event) {
    const target : HTMLSelectElement = ev.target as HTMLSelectElement,
          value : number = parseInt(target.value);
    this.select(value);
  }

  // Render helpers
  /** Return an Ionic Select or Segment element if available, otherwise a vanilla HTML Select Element */
  selectNode() : JSX.Element {
    const currentlySelected : number = this.obj.metadata.selected;

    // Ionic available and
    if(customElements && !!customElements.get('ion-select')) {
      const optionsAreLong : boolean = this.obj.value && this.obj.value
          .map(option => this.obj.getVersionLabel(option).length > 15)
          .reduce((a, b) => a || b);

      // <= 2, short options
      if(!optionsAreLong && this.obj.value.length <= 2) {
        return (
          <ion-segment color="primary" value={currentlySelected.toString()}>
            {this.obj.value.map((option, optionIndex) =>
              <ion-segment-button value={optionIndex.toString()}>
                <ion-label>{this.obj.getVersionLabel(option)}</ion-label>
              </ion-segment-button>
            )}
            {/* Add Button if editable */}
            { this.editable && <ion-segment-button value='add' class='add'>
                <ion-label>+</ion-label>
              </ion-segment-button> }
          </ion-segment>
        );
      }
      // >2 options, or options are longish
      else {
        return (
          <ion-toolbar>
            <ion-select value={currentlySelected} slot={this.editable ? 'start' : 'end'}>
              {this.obj.value.map((option, optionIndex) =>
                <ion-select-option value={optionIndex}>
                  <ion-label>{this.obj.getVersionLabel(option)}</ion-label>
                </ion-select-option>
              )}
            </ion-select>
            {this.editable && <ion-buttons slot='end'>
              <ion-button onClick={() => this.select('add')}>
                <ion-icon slot='icon-only' name='add'></ion-icon>
              </ion-button>
            </ion-buttons>}
          </ion-toolbar>
        );
      }
    }
    // Ionic not availabe
    else {
      return (
        <ldf-label-bar>
          <select onInput={ev => this.onSelectChange(ev)} slot={this.editable ? 'start' : 'end'}>
            {this.obj.value.map((option, optionIndex) =>
              <option
                value={optionIndex}
                selected={optionIndex == currentlySelected}
              >{this.obj.getVersionLabel(option)}</option>
            )}
          </select>
        {this.editable && <button slot='end' onClick={() => this.select('add')}>+</button>}
        </ldf-label-bar>
      );
    }
  }

  // Render
  render() {
    return (
      <Host lang={this.obj.language}>
        <ldf-label-bar>
          {/* Can be overwritten by apps that use Ionic or other frameworks */}
          <slot slot='end' name='controls'>{this.selectNode()}</slot>
        </ldf-label-bar>
        <ldf-liturgical-document
          doc={this.selectedDoc}
          path={`${this.path}/value/${this.obj.metadata.selected}`}
          base={`${this.path}/value`}
          index={this.obj.metadata.selected}
          editable={this.editable}
          parentType='option'
        >
        </ldf-liturgical-document>
      </Host>
    );
  }
}
