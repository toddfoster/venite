/* TODO
 * Source/citation */

import { dateFromYMDString, Heading, LiturgicalDay } from "@venite/ldf/dist/cjs";
import { Paragraph, TextRun } from "docx";
import { DisplaySettings } from "./display-settings";
import { LDFStyles } from "./ldf-styles";
import { DocxChild } from "./ldf-to-docx";
import { LocaleStrings } from "./locale-strings";
import { notEmpty } from "./not-empty";

export function headingToDocx(doc : Heading, displaySettings : DisplaySettings, localeStrings : LocaleStrings) : DocxChild[] {
  const level : number = doc.metadata?.level ? doc.metadata.level : 4,
    hasCitation = Boolean(doc?.citation),
    hasSource = Boolean(doc?.source),
    isDate = doc?.style == 'date',
    isDay = doc?.style == 'day',
    isText = doc?.style == undefined || doc?.style == 'text' || (!isDate && !isDay);

  function headerNode(level : number, children : TextRun[], display : boolean) : Paragraph | null {
    return display
      ? new Paragraph({
        style: `Heading_${level}`,
        children
      })
      : null;
  }

  function textNode(text : string) : TextRun {
    return new TextRun(text);
  }

  function dateNode() : TextRun | null {
    const hasDate = !!doc?.day?.date;
    if(hasDate) {
      const date = dateFromYMDString(doc?.day?.date || '');
      return new TextRun(
        date.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })
      );
    } else {
      return null;
    }
  }

  function dayNode(day : LiturgicalDay) : string[] {
    if(day?.holy_day_observed?.name && (day?.holy_day_observed?.type?.rank || 0) >= 3) {
      return [day?.holy_day_observed?.name];
    } else {
      const date = dateFromYMDString(day?.date);

      // Sunday => name of week
      if(date.getDay() == 0) {
        const the = localeStrings.the || ' the ';
        return [
          day?.week?.omit_the ? '' : ` ${the[1].toUpperCase()}${the.slice(2, localeStrings.the.length)} `,          ,
          day?.week?.name
        ].filter(notEmpty);
      }
      // weekday => [weekday] after (the) [Sunday]
      else {
        return [
          date.toLocaleDateString('en', { weekday: 'long' }),
          localeStrings.after || ' after the ',
          day?.week?.omit_the ? '' : localeStrings.the,
          day?.week?.name
        ];
      }
    }
  }

  const text = isText && doc?.value?.length > 0
      ? doc?.value?.map((text, index) => headerNode(level, [textNode(text)], index == 0 || Boolean(text))).filter(notEmpty)
      : null,
    date = isDate ? dateNode() : null,
    day = isDay && doc.day ? dayNode(doc.day) : null;

  return [
    ... text ? text : [],
    date ? headerNode(level, [date], true) : null,
    day ? headerNode(level, day.map(n => new TextRun(n)), true) : null
  ].filter(notEmpty);
}