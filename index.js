#!/usr/bin/env node
import fs from 'fs';
import path from 'path'
import chokidar from 'chokidar';
import yaml from 'js-yaml';
//import {s3_commit, s3Client} from './s3-commit.js';
import {md2html} from './md2html.js'

import mime from 'mime-types'
// import { exec, execSync } from "child_process";
import {get_accessKeys, S3} from '294-aws-s3';

const print = console.log.bind(console); // interesting


/*
import mime from 'mime-types'
// import { exec, execSync } from "child_process";
import {get_accessKeys, S3} from '294-aws-s3';

export const s3Client = new S3(get_accessKeys());
//export const Bucket = 'cb-survey'
*/


import yargs from 'yargs';

const argv = yargs(process.argv.slice(2))
  .alias('h','help')
  .alias('v','verbose').count('verbose')
//  .alias('i','input-dir')
  .alias('n','dry-run')

  .options({
  //  'dirOnly': {type:'boolean', default:false},
    'dry-run':  {type:'boolean', default:false},
//    'force': {type:'boolean', default:false},
  }).argv;

//console.log({argv})
const {verbose, 'dry-run':dry_run} = argv;

//const input = argv._[0]; // should be s3://<Bucket>/<Key>

print(`Starting 281-watcher-4-buckets`)



const doc = yaml.load(fs.readFileSync('./.fw4b.yaml', 'utf8'));
;(verbose >0) && console.log(doc);

const {watched:watch_list,
  ignored, Prefix='', Bucket,
  s3cfg //= '/home/dkz/.s3cfg'
  } = doc


const s3Client = new S3(get_accessKeys(s3cfg));

if (verbose >0) {
  console.log({watch_list})
  console.log({ignored})
  console.log({Bucket})
  console.log({Prefix})
  console.log({s3cfg})
}



try {
  main();
}
catch (e) {
 console.log(e);
 process.exit();
}





async function main() {


  {
    const retv1 = await s3Client.listBuckets()
    console.log({retv1})
  }


  const watcher = chokidar.watch(watch_list,{
//    cwd: './',
    ignoreInitial: true,
    ignored,
  }).on('all', async (event, fpath) => {
    try {
      ;(verbose>0) && console.log(`watcher@54: [${event}] <${fpath}> Prefix:(${Prefix})`);
      switch(event) {
        case 'add':
        case 'change': {
          const Key = path.join(Prefix,fpath)
          /*
              FIRST save file as it (the original)
          */
          const retv = await s3_commit(fpath,Bucket,Key,{verbose:0})
          console.log(`s3-commit@67 =>`,retv)

          /*
              THEN if .MD file, operate a renderer
              and save HTML generated.
          */

          const {ext,dir} = path.parse(fpath);
          if (ext == '.md') {
            if (!fpath.startsWith('.')) fpath = './'+fpath;
            const {html:body ,metadata} = md2html(fpath)
            if (body) {
              const {template = './main.html'} = metadata;
              ;(verbose>0) && console.log({template})
              /*
                  we should have lookup template
                  FIRST: current folder
                  THEN : parent
              */
              const template_fn = path.join(dir,template)
              const main = fs.readFileSync(template_fn, 'utf8');
              if (!main) {
                print(`@101 missing template <${main}> <${template_fn}>`)
                break; // we are in a switch ! should work.
              }


              const html = main.replace(/<slot *\/>/,body)
                .replace(/<title>[^<]*<\/title>/, `<title>${metadata.title}</title>`)

              ;(verbose >=2) && print({html})
              const html_Key = Key.replace(/\.md$/,'.html').replace('\\','/')
              ;(verbose>0) && print(`index@117 about to putObject <${Bucket}/${html_Key}> ...`)

              const retv = await s3Client.putObject(html,Bucket, html_Key,{
                verbose: 0,
                ContentType: 'text/html',
                ACL: 'public-read',
              })
              print(`s3-commit@101 <${Bucket}/${html_Key}> =>`,retv)
            } else {
              print(`ALERT! md2html@103 did not return html code`)
            }
          }

        }
        break;

        default: {
          print(`Invalid event <${event}> Ignored.`)
        }

      }
    } catch(e) {
      console.log(`ALERT@107 failed to process event <${event}> :`,e)
    }
  });




  process.on('SIGINT', async function() {
    console.log("Caught interrupt signal");
    await watcher.close().then(() => {
      var watchedPaths = watcher.getWatched();
      print('closed',watchedPaths)
    });

    process.exit();
  });

}

function main2_Obsolete() {
  const watch_list =[
    './*.js',
  ];

  const ignored = ['**/node_modules', '**/.*'];

  const watcher = chokidar.watch(watch_list, {
    persistent: true,
    ignored,
    ignoreInitial: true,
    followSymlinks: true,
  //  cwd: '/home/dkz',
    cwd: '/home/dkz/2022/281-watcher-4-bucket/',
    disableGlobbing: false,

    usePolling: false,
    interval: 100,
    binaryInterval: 300,
    alwaysStat: false,
    depth: 99,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 1000
    },

    ignorePermissionErrors: false,
    atomic: true // or a custom 'atomicity delay', in milliseconds (default 100)
  });

}




export async function s3_commit(input, Bucket, Key, o={}) {
  const {ACL='public-read', ContentType, verbose} = o;

  print(`s3-commit@31 (${input}) Key:${Key}`)
//  print({s3Client})
  const mime_type = mime.lookup(Key)
  const encoding = (mime_type.startsWith('text/')?{encoding:'utf8'}:{})

  const Body = fs.readFileSync(input, encoding)
  //console.log({Body})

  const retv2 = await s3Client.putObject({
      Bucket, Key, Body,
      ACL,
      ContentType, // if not specified, auto-detect mime from filename extension.
      verbose
      })

  ;(verbose >0) && console.log(`putObject:`,retv2)

  return retv2
}
