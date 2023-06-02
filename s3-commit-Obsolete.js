import fs from 'fs';
import path from 'path'
import mime from 'mime-types'
// import { exec, execSync } from "child_process";
import {get_accessKeys, S3} from '294-aws-s3';

const print = console.log.bind(console); // interesting

export const s3Client = new S3(get_accessKeys());


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
