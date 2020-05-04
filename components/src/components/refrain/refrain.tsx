import { Component, Prop, Watch, State, Host, h } from '@stencil/core';
import { Refrain } from '../../../../ldf/src/refrain';

@Component({
  tag: 'ldf-refrain',
  styleUrl: 'refrain.scss',
  shadow: true
})
export class RefrainComponent {
  // States
  @State() obj : Refrain;

  // Properties
  /**
   * An LDF Refrain object. If both `doc` and `json` are passed, `doc` is used.
   */
  @Prop() doc : Refrain | string;
  @Watch('doc')
  docChanged(newDoc : Refrain | string) {
    try {
      if(typeof newDoc == 'string') {
        this.obj = new Refrain(JSON.parse(newDoc));
      } else {
        this.obj = new Refrain(newDoc);
      }
    } catch(e) {
      console.warn(e);
      this.obj = new Refrain();
    }
  }

  /**
   * A JSON Pointer that points to the Collect being edited
   */
  @Prop({ reflect: true }) path : string;

  /**
   * Whether the object is editable
   */
  @Prop() editable : boolean;

  // Lifecycle events
  componentWillLoad() {
    this.docChanged(this.doc);
  }

  // Render
  render() {
    return (
      <Host>
        <ldf-label-bar>
          <slot slot='end' name='controls'></slot>
        </ldf-label-bar>
        <div class={this.obj ? this.obj.style : ''}>
        {this.obj.value && this.obj.value.map((para, ii) =>
          this.editable ?
          <ldf-editable-text
            id={`${this.obj.uid || this.obj.slug}-${ii}`}
            text={para}
            path={`${this.path}/value/${ii}`}
          ></ldf-editable-text> :
          <p
            id={`${this.obj.uid || this.obj.slug}-${ii}`}
            innerHTML={para}
          ></p>
        )}
        </div>
      </Host>
    );
  }
}
