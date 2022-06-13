import fs from 'fs';
import assert from 'assert';

import {marked} from 'marked';
const renderer = new marked.Renderer();
import yaml from 'js-yaml'


function extract_metadata(s) {
  if (!s.startsWith('---')) {
    // there is no metadata
    return {md_code:s}
  }

  const searchStr = '\n---'; // this one exclude the first ONE !!!
  const ix = [...s.matchAll(new RegExp(searchStr, 'gi'))].map(a => a.index);
//  console.log({ix}); // [2, 25, 27, 33]

  if (ix.length < 1) {
    return {error: `did not find end of metadata ix.length:${ix.length}`}
  }

  const metadata_ = s.substring(0,ix[0]).replace(/^[\-]+/,'').trim();

  //console.log(`@25 <${s.substring(ix[0])}>`)

  const md_code = s.substring(ix[0]).replace(/^[\s\S]\-+/,'').trim();

//  console.log({metadata_})
//  console.log({md_code})

  const metadata = yaml.load(metadata_)
  return {metadata, md_code}
} // extract-metadata


export function md2html(data, o={}) {
  /*
    FIRST check (guess) if s is data or fileName
    if startsWith('.' or '/') it's a fileName
  */

  if (data.startsWith('.') || data.startsWith('/')) {
    const fileName = data;
    data = fs.readFileSync(fileName, 'utf8');
    if (!data) return;
  }


  /*
      here data might or might not startsWith('---') YAML metadata
  */

  const {metadata, md_code, error} = extract_metadata(data)
  if (!metadata) {
    // must have at least empty object
    console.log(`extract_metadata =>`,{error})
    return {}
  }

  const html = marked(md_code, {renderer});

  console.log({metadata})
  console.log({html})


  return {html, metadata}
}
