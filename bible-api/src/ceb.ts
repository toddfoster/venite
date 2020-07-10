import { BibleReading, BibleReadingVerse } from '@venite/ldf';
import { requestHTML } from './request-html';
import { HTMLElement, NodeType, TextNode } from 'node-html-parser';

export async function getCEB(citation : string) : Promise<BibleReading> {
  const url = buildCEBURL(citation),
        page = await requestHTML(url),
        text = page.querySelectorAll('#ceb_search_results p'),
        value = parseCEBResponse(text);

  return new BibleReading({
    type: 'bible-reading',
    style: 'long',
    citation,
    label: `A Reading from ${citation} (CEB)`,
    language: 'en',
    version: 'CEB',
    value
  });
}

export function buildCEBURL(citation : string) : string {
  const params = new URLSearchParams();
  params.append('query', citation);
  return `https://www.commonenglishbible.com/explore/passage-lookup/?${params.toString()}`;
}

export function parseCEBResponse(paragraphs : HTMLElement[]) : BibleReadingVerse[] {
  let paragraphResults : BibleReadingVerse[][] = new Array();

  paragraphs.forEach(paragraph => {
    let book : string, chapter : string, verse : string;
    let verses : BibleReadingVerse[] = new Array();

    paragraph.childNodes
    .filter(node => node instanceof TextNode || (node instanceof HTMLElement && (node.classNames.includes('text') || node.tagName === 'br' || node.classNames.includes('indent-1') || node.classNames.includes('indent-2') || node.classNames.includes('chapter-2'))))
    .forEach(node => {
      if(node instanceof HTMLElement && node.rawAttributes?.class?.includes('chapter-')) {
        node = node.querySelector('.text');
      }

      // update running citation, if a citation class is on a .text element
      if(node instanceof HTMLElement && node.classNames.includes('text')) {
        const citation = node.classNames.find(className => className !== 'text');
        if(citation) {
          [book, chapter, verse] = citation.split('-');
        }
      }

      // push data for this node
      let text : string;
      try {
        text = node.childNodes.map(n => {
          if(n instanceof HTMLElement) {
            if(n.classNames.includes('small-caps')) {
              return n.text.toUpperCase();
            } else if(n.tagName == 'br') {
              return '\n';
            } else {
              return n.text;
            }
          } else {
            return n.text;
          }
        }).join('').replace(/\s\s+/, '\t');
        if(node instanceof HTMLElement && node.tagName == 'br') {
          text = '\n';
        }
      } catch(e) {
        text = paragraph.text;
      }
      
      verses.push({
        book,
        chapter,
        verse,
        text: text.replace(/^\d+\s*/, ' ')
      })
    });

    // merge duplicate verses
    const verseTree = verses.reduce((accumulator, currentVerse) => {
      const ref = `${currentVerse.book}-${currentVerse.chapter}-${currentVerse.verse}`;
      if(accumulator[ref] === undefined) {
        return ({ ... accumulator, [ref]: currentVerse })
      } else {
        const previousVersionOfVerse = accumulator[ref],
              newText = previousVersionOfVerse.text + currentVerse.text;
        return ({ ... accumulator, [ref]: { ... previousVersionOfVerse, text: newText } });
      }
    }, {} as { [x: string]: BibleReadingVerse});

    paragraphResults.push(Object.values(verseTree));
  });

  return paragraphResults
    .flat()
    .filter(verse => verse.book !== undefined || verse.chapter !== undefined || verse.verse !== undefined);
}
