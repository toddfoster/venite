/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
import { BibleReading, Change, Cursor, Heading, LiturgicalDocument, ResponsivePrayer, SelectableCitation, Text, } from "@venite/ldf";
import { Liturgy, } from "../../ldf/src/liturgy/liturgy";
import { Option, } from "../../ldf/src/option";
import { Psalm, } from "../../ldf/src/psalm";
import { Refrain, } from "../../ldf/src/refrain";
import { Rubric, } from "../../ldf/src/rubric";
export namespace Components {
    interface LdfBibleReading {
        /**
          * An LDF BibleReading object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": BibleReading | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * Asynchronously return localization strings
         */
        "getLocaleStrings": () => Promise<{
            [x: string]: string;
        }>;
        /**
          * Load and render a particular Bible passage given by citation from the API
         */
        "loadCitation": (citation?: string, version?: string) => Promise<void>;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path": string;
    }
    interface LdfEditableText {
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path": string;
        /**
          * Displays if text is falsy or an empty string
         */
        "placeholder": string;
        /**
          * Reduces the list of edits triggered by input events to as few contiguous edits as possible. and emits it as a `docChanged` event
         */
        "processEdits": () => Promise<Change[]>;
        /**
          * Sets private cursor field to a Cursor instance and sends it as a `cursor` event
         */
        "registerCursor": () => Promise<Cursor>;
        /**
          * Starting text for editing
         */
        "text": string;
    }
    interface LdfHeading {
        /**
          * An LDF Heading object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": Heading | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path": string;
    }
    interface LdfLabelBar {
    }
    interface LdfLiturgicalDocument {
        /**
          * An LDF LiturgicalDocument object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": LiturgicalDocument | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path": string;
    }
    interface LdfLiturgy {
        /**
          * An LDF Liturgy object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": Liturgy | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * A JSON Pointer that points to the Liturgy being edited
         */
        "path": string;
    }
    interface LdfOption {
        /**
          * An LDF Option object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": Option | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * A JSON Pointer that points to the Option being edited
         */
        "path": string;
        /**
          * Display the nth option
         */
        "select": (index: number) => Promise<void>;
    }
    interface LdfPsalm {
        /**
          * An LDF Psalm object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": Psalm | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path": string;
    }
    interface LdfRefrain {
        /**
          * An LDF Refrain object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": Refrain | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path": string;
    }
    interface LdfResponsivePrayer {
        /**
          * An LDF ResponsivePrayer object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": ResponsivePrayer | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * A JSON Pointer that points to the ResponsivePrayer being edited
         */
        "path": string;
    }
    interface LdfRubric {
        /**
          * An LDF Rubric object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": Rubric | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path": string;
    }
    interface LdfString {
        /**
          * Citation (used in Share and Favorite APIs)
         */
        "citation": SelectableCitation;
        /**
          * Enable, disable, or force dropcap on the first letter of the text.
         */
        "dropcap": "enabled" | "force" | "disabled";
        /**
          * Minimum length (in characters) a string must be to have a dropcap.
         */
        "dropcapMinLength": number;
        /**
          * String's index within its parent.
         */
        "index": number;
        /**
          * Enable or disable replacement of tetragrammaton.
         */
        "replaceTetragrammaton": boolean;
        /**
          * The text to be processed.
         */
        "text": string;
    }
    interface LdfText {
        /**
          * An LDF Text object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc": Text | string;
        /**
          * Whether the object is editable
         */
        "editable": boolean;
        /**
          * Asynchronously return localization strings
         */
        "getLocaleStrings": () => Promise<{
            [x: string]: string;
        }>;
        /**
          * A JSON Pointer that points to the Text being edited
         */
        "path": string;
    }
}
declare global {
    interface HTMLLdfBibleReadingElement extends Components.LdfBibleReading, HTMLStencilElement {
    }
    var HTMLLdfBibleReadingElement: {
        prototype: HTMLLdfBibleReadingElement;
        new (): HTMLLdfBibleReadingElement;
    };
    interface HTMLLdfEditableTextElement extends Components.LdfEditableText, HTMLStencilElement {
    }
    var HTMLLdfEditableTextElement: {
        prototype: HTMLLdfEditableTextElement;
        new (): HTMLLdfEditableTextElement;
    };
    interface HTMLLdfHeadingElement extends Components.LdfHeading, HTMLStencilElement {
    }
    var HTMLLdfHeadingElement: {
        prototype: HTMLLdfHeadingElement;
        new (): HTMLLdfHeadingElement;
    };
    interface HTMLLdfLabelBarElement extends Components.LdfLabelBar, HTMLStencilElement {
    }
    var HTMLLdfLabelBarElement: {
        prototype: HTMLLdfLabelBarElement;
        new (): HTMLLdfLabelBarElement;
    };
    interface HTMLLdfLiturgicalDocumentElement extends Components.LdfLiturgicalDocument, HTMLStencilElement {
    }
    var HTMLLdfLiturgicalDocumentElement: {
        prototype: HTMLLdfLiturgicalDocumentElement;
        new (): HTMLLdfLiturgicalDocumentElement;
    };
    interface HTMLLdfLiturgyElement extends Components.LdfLiturgy, HTMLStencilElement {
    }
    var HTMLLdfLiturgyElement: {
        prototype: HTMLLdfLiturgyElement;
        new (): HTMLLdfLiturgyElement;
    };
    interface HTMLLdfOptionElement extends Components.LdfOption, HTMLStencilElement {
    }
    var HTMLLdfOptionElement: {
        prototype: HTMLLdfOptionElement;
        new (): HTMLLdfOptionElement;
    };
    interface HTMLLdfPsalmElement extends Components.LdfPsalm, HTMLStencilElement {
    }
    var HTMLLdfPsalmElement: {
        prototype: HTMLLdfPsalmElement;
        new (): HTMLLdfPsalmElement;
    };
    interface HTMLLdfRefrainElement extends Components.LdfRefrain, HTMLStencilElement {
    }
    var HTMLLdfRefrainElement: {
        prototype: HTMLLdfRefrainElement;
        new (): HTMLLdfRefrainElement;
    };
    interface HTMLLdfResponsivePrayerElement extends Components.LdfResponsivePrayer, HTMLStencilElement {
    }
    var HTMLLdfResponsivePrayerElement: {
        prototype: HTMLLdfResponsivePrayerElement;
        new (): HTMLLdfResponsivePrayerElement;
    };
    interface HTMLLdfRubricElement extends Components.LdfRubric, HTMLStencilElement {
    }
    var HTMLLdfRubricElement: {
        prototype: HTMLLdfRubricElement;
        new (): HTMLLdfRubricElement;
    };
    interface HTMLLdfStringElement extends Components.LdfString, HTMLStencilElement {
    }
    var HTMLLdfStringElement: {
        prototype: HTMLLdfStringElement;
        new (): HTMLLdfStringElement;
    };
    interface HTMLLdfTextElement extends Components.LdfText, HTMLStencilElement {
    }
    var HTMLLdfTextElement: {
        prototype: HTMLLdfTextElement;
        new (): HTMLLdfTextElement;
    };
    interface HTMLElementTagNameMap {
        "ldf-bible-reading": HTMLLdfBibleReadingElement;
        "ldf-editable-text": HTMLLdfEditableTextElement;
        "ldf-heading": HTMLLdfHeadingElement;
        "ldf-label-bar": HTMLLdfLabelBarElement;
        "ldf-liturgical-document": HTMLLdfLiturgicalDocumentElement;
        "ldf-liturgy": HTMLLdfLiturgyElement;
        "ldf-option": HTMLLdfOptionElement;
        "ldf-psalm": HTMLLdfPsalmElement;
        "ldf-refrain": HTMLLdfRefrainElement;
        "ldf-responsive-prayer": HTMLLdfResponsivePrayerElement;
        "ldf-rubric": HTMLLdfRubricElement;
        "ldf-string": HTMLLdfStringElement;
        "ldf-text": HTMLLdfTextElement;
    }
}
declare namespace LocalJSX {
    interface LdfBibleReading {
        /**
          * An LDF BibleReading object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: BibleReading | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path"?: string;
    }
    interface LdfEditableText {
        "onCursorMoved"?: (event: CustomEvent<Cursor>) => void;
        "onDocChanged"?: (event: CustomEvent<Change[]>) => void;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path"?: string;
        /**
          * Displays if text is falsy or an empty string
         */
        "placeholder"?: string;
        /**
          * Starting text for editing
         */
        "text"?: string;
    }
    interface LdfHeading {
        /**
          * An LDF Heading object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: Heading | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path"?: string;
    }
    interface LdfLabelBar {
    }
    interface LdfLiturgicalDocument {
        /**
          * An LDF LiturgicalDocument object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: LiturgicalDocument | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path"?: string;
    }
    interface LdfLiturgy {
        /**
          * An LDF Liturgy object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: Liturgy | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the Liturgy being edited
         */
        "path"?: string;
    }
    interface LdfOption {
        /**
          * An LDF Option object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: Option | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the Option being edited
         */
        "path"?: string;
    }
    interface LdfPsalm {
        /**
          * An LDF Psalm object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: Psalm | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path"?: string;
    }
    interface LdfRefrain {
        /**
          * An LDF Refrain object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: Refrain | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path"?: string;
    }
    interface LdfResponsivePrayer {
        /**
          * An LDF ResponsivePrayer object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: ResponsivePrayer | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the ResponsivePrayer being edited
         */
        "path"?: string;
    }
    interface LdfRubric {
        /**
          * An LDF Rubric object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: Rubric | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the Collect being edited
         */
        "path"?: string;
    }
    interface LdfString {
        /**
          * Citation (used in Share and Favorite APIs)
         */
        "citation"?: SelectableCitation;
        /**
          * Enable, disable, or force dropcap on the first letter of the text.
         */
        "dropcap"?: "enabled" | "force" | "disabled";
        /**
          * Minimum length (in characters) a string must be to have a dropcap.
         */
        "dropcapMinLength"?: number;
        /**
          * String's index within its parent.
         */
        "index"?: number;
        /**
          * Enable or disable replacement of tetragrammaton.
         */
        "replaceTetragrammaton"?: boolean;
        /**
          * The text to be processed.
         */
        "text"?: string;
    }
    interface LdfText {
        /**
          * An LDF Text object. If both `doc` and `json` are passed, `doc` is used.
         */
        "doc"?: Text | string;
        /**
          * Whether the object is editable
         */
        "editable"?: boolean;
        /**
          * A JSON Pointer that points to the Text being edited
         */
        "path"?: string;
    }
    interface IntrinsicElements {
        "ldf-bible-reading": LdfBibleReading;
        "ldf-editable-text": LdfEditableText;
        "ldf-heading": LdfHeading;
        "ldf-label-bar": LdfLabelBar;
        "ldf-liturgical-document": LdfLiturgicalDocument;
        "ldf-liturgy": LdfLiturgy;
        "ldf-option": LdfOption;
        "ldf-psalm": LdfPsalm;
        "ldf-refrain": LdfRefrain;
        "ldf-responsive-prayer": LdfResponsivePrayer;
        "ldf-rubric": LdfRubric;
        "ldf-string": LdfString;
        "ldf-text": LdfText;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "ldf-bible-reading": LocalJSX.LdfBibleReading & JSXBase.HTMLAttributes<HTMLLdfBibleReadingElement>;
            "ldf-editable-text": LocalJSX.LdfEditableText & JSXBase.HTMLAttributes<HTMLLdfEditableTextElement>;
            "ldf-heading": LocalJSX.LdfHeading & JSXBase.HTMLAttributes<HTMLLdfHeadingElement>;
            "ldf-label-bar": LocalJSX.LdfLabelBar & JSXBase.HTMLAttributes<HTMLLdfLabelBarElement>;
            "ldf-liturgical-document": LocalJSX.LdfLiturgicalDocument & JSXBase.HTMLAttributes<HTMLLdfLiturgicalDocumentElement>;
            "ldf-liturgy": LocalJSX.LdfLiturgy & JSXBase.HTMLAttributes<HTMLLdfLiturgyElement>;
            "ldf-option": LocalJSX.LdfOption & JSXBase.HTMLAttributes<HTMLLdfOptionElement>;
            "ldf-psalm": LocalJSX.LdfPsalm & JSXBase.HTMLAttributes<HTMLLdfPsalmElement>;
            "ldf-refrain": LocalJSX.LdfRefrain & JSXBase.HTMLAttributes<HTMLLdfRefrainElement>;
            "ldf-responsive-prayer": LocalJSX.LdfResponsivePrayer & JSXBase.HTMLAttributes<HTMLLdfResponsivePrayerElement>;
            "ldf-rubric": LocalJSX.LdfRubric & JSXBase.HTMLAttributes<HTMLLdfRubricElement>;
            "ldf-string": LocalJSX.LdfString & JSXBase.HTMLAttributes<HTMLLdfStringElement>;
            "ldf-text": LocalJSX.LdfText & JSXBase.HTMLAttributes<HTMLLdfTextElement>;
        }
    }
}
