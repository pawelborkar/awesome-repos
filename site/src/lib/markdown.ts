import { marked } from 'marked';
import sanitize from 'sanitize-html';
export const renderMarkdown = (source: string) => sanitize(marked.parse(source, {async:false}), {
  allowedTags: ['p','h2','h3','h4','ul','ol','li','a','strong','em','code','pre','blockquote','br'],
  allowedAttributes: {a:['href','title']},
  allowedSchemes: ['https','http'],
  allowProtocolRelative: false,
});
