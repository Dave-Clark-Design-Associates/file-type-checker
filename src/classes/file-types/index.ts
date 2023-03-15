import {
  fetchFromObject,
  findMatroskaDocTypeElements,
  isFlvStringInclude,
  isftypStringInclude,
} from "../../utils";
import { AudioTypes } from "./audio";
import { CompressedTypes } from "./compressed";
import { OtherTypes } from "./other";
import { ImageTypes } from "./image";
import { VideoTypes } from "./video";
import { FileInfo, FileSignature } from "../core";
import { DetectedFileInfo } from "../dto";
import { isFLV, isM4V, isMKV, isWEBM } from "../../validation";

export const FileTypseRequiredAdditionalCheck: Array<string> = [
  "m4v",
  "flv",
  "mp4",
  "mkv",
  "webm",
];

/**
 * A class hold all supported file typs with their unique signatures
 */
export class FileTypes {
  // audio
  static AAC: FileInfo = AudioTypes.AAC;
  static AMR: FileInfo = AudioTypes.AMR;
  static FLAC: FileInfo = AudioTypes.FLAC;
  static M4A: FileInfo = AudioTypes.M4A;
  static MP3: FileInfo = AudioTypes.MP3;
  static WAV: FileInfo = AudioTypes.WAV;

  // image
  static BMP: FileInfo = ImageTypes.BMP;
  static BPG: FileInfo = ImageTypes.BPG;
  static CR2: FileInfo = ImageTypes.CR2;
  static EXR: FileInfo = ImageTypes.EXR;
  static GIF: FileInfo = ImageTypes.GIF;
  static ICO: FileInfo = ImageTypes.ICO;
  static JPEG: FileInfo = ImageTypes.JPEG;
  static PBM: FileInfo = ImageTypes.PBM;
  static PGM: FileInfo = ImageTypes.PGM;
  static PNG: FileInfo = ImageTypes.PNG;
  static PPM: FileInfo = ImageTypes.PPM;
  static PSD: FileInfo = ImageTypes.PSD;
  static WEBP: FileInfo = ImageTypes.WEBP;

  // video
  static AVI: FileInfo = VideoTypes.AVI;
  static BLEND: FileInfo = VideoTypes.BLEND;
  static FLV: FileInfo = VideoTypes.FLV;
  static M4V: FileInfo = VideoTypes.M4V;
  static MKV: FileInfo = VideoTypes.MKV;
  static MOV: FileInfo = VideoTypes.MOV;
  static MP4: FileInfo = VideoTypes.MP4;
  static OGG: FileInfo = VideoTypes.OGG;
  static SWF: FileInfo = VideoTypes.SWF;
  static WEBM: FileInfo = VideoTypes.WEBM;

  // compressed
  static _7Z: FileInfo = CompressedTypes._7Z;
  static LZH: FileInfo = CompressedTypes.LZH;
  static RAR: FileInfo = CompressedTypes.RAR;
  static ZIP: FileInfo = CompressedTypes.ZIP;

  // other
  static ELF: FileInfo = OtherTypes.ELF;
  static INDD: FileInfo = OtherTypes.INDD;
  static PDF: FileInfo = OtherTypes.PDF;
  static PS: FileInfo = OtherTypes.PS;
  static RTF: FileInfo = OtherTypes.RTF;
  static SQLITE: FileInfo = OtherTypes.SQLITE;
  static STL: FileInfo = OtherTypes.STL;
  static TTF: FileInfo = OtherTypes.TTF;

  /**
   * Receive information on a file type by its property name from FileTypes class
   *
   * @param propertyName Property name from FileTypes class
   *
   * @returns {FileInfo} File type information
   */
  public static getInfoByName(propertyName: string): FileInfo {
    const file = fetchFromObject(FileTypes, propertyName.toUpperCase());
    return file;
  }

  /**
   * Receive an array of file type signatures by its property name from FileTypes class
   *
   * @param propertyName Property name from FileTypes class
   *
   * @returns {Array<FileSignature>} All unique signatures with their information
   */
  public static getSignaturesByName(
    propertyName: string
  ): Array<FileSignature> {
    const file = fetchFromObject(FileTypes, propertyName.toUpperCase());
    return file.signatures;
  }

  /**
   * Determine if a valid signature exist in a file chunk
   *
   * @param fileChunk A chunk from the beginning of a file content, represents in array of numbers
   * @param acceptedSignatures Valid signatures to search for in fileChunk
   *
   * @returns {boolean} True if found a valid signature inside the chunk, otherwise false
   */
  public static detectSignature(
    fileChunk: Array<number>,
    acceptedSignatures: Array<FileSignature>
  ): FileSignature | undefined {
    for (const signature of acceptedSignatures) {
      let found = true;
      let offset = signature.offset || 0;
      let skippedBytes = 0;
      for (let i = 0; i < signature.sequence.length; i++) {
        if (signature.skippedBytes && signature.skippedBytes.includes(i)) {
          skippedBytes++;
          continue;
        }
        if (fileChunk[offset + i] !== signature.sequence[i - skippedBytes]) {
          found = false;
          break;
        }
      }
      if (found) {
        return signature;
      }
    }
    return undefined;
  }

  /**
   * Perfomrs an additional check for detected file types by their unique structure
   *
   * @param fileChunk A chunk from the beginning of a file content, represents in array of numbers
   * @param detectedFiles A list of detected files
   * @returns {string | undefined} File type extension if found, otherwise undefined
   */
  public static detectTypeByAdditionalCheck(
    fileChunk: Array<number>,
    detectedFiles: Array<DetectedFileInfo | FileInfo>
  ): string | undefined {
    const detectedExtensions = detectedFiles.map((df) => df.extension);
    if (detectedExtensions.some((de) => ["m4v", "flv", "mp4"].includes(de))) {
      const isFlv = isFLV(fileChunk) && isFlvStringInclude(fileChunk);
      if (isFlv) return "flv";
      const isM4v = isM4V(fileChunk) && isftypStringInclude(fileChunk);
      if (isM4v) return "m4v";
      return "mp4";
    } else if (detectedExtensions.some((de) => ["mkv", "webm"].includes(de))) {
      const matroskaDocTypeElement = findMatroskaDocTypeElements(fileChunk);
      if (matroskaDocTypeElement === "mkv" && isMKV(fileChunk)) return "mkv";
      else if (matroskaDocTypeElement === "webm" && isWEBM(fileChunk))
        return "webm";
      return undefined;
    }
    return undefined;
  }

  /**
   * Determine if a file chunk contains a valid signature and return the file signature if exist
   *
   * @param fileChunk A chunk from the beginning of a file content, represents in array of numbers
   * @param acceptedSignatures Valid signatures to search for in fileChunk
   *
   * @returns {FileSignature | undefined } FileSignature if found a valid signature, otherwise undefined
   */
  public static detectbySignatures(
    fileChunk: Array<number>,
    acceptedSignatures: Array<FileSignature>
  ): FileSignature | undefined {
    for (const signature of acceptedSignatures) {
      let skippedBytes = 0;
      let found = true;
      let offset = signature.offset || 0;
      const signatureLength = signature?.skippedBytes
        ? signature.sequence.length + signature.skippedBytes.length
        : signature.sequence.length;
      for (let i = 0; i < signatureLength; i++) {
        if (signature.skippedBytes && signature.skippedBytes.includes(i)) {
          skippedBytes++;
          continue;
        }
        if (fileChunk[offset + i] !== signature.sequence[i - skippedBytes]) {
          found = false;
          break;
        }
      }
      if (found) {
        return signature;
      }
    }
    return undefined;
  }

  /**
   * Determine if file content contains a valid signature of a required type
   *
   * @param fileChunk A chunk from the beginning of a file content, represents in array of numbers
   * @param type The file type to match against
   *
   * @returns {boolean} True if found a signature of the type in file content, otherwise false
   */
  public static checkByFileType(
    fileChunk: Array<number>,
    type: string
  ): boolean {
    if (FileTypes.hasOwnProperty(type.toUpperCase())) {
      let acceptedSignatures: Array<FileSignature> =
        FileTypes.getSignaturesByName(type.toUpperCase());

      const detectedSignature = FileTypes.detectSignature(
        fileChunk,
        acceptedSignatures
      );
      if (detectedSignature) return true;
    }
    return false;
  }
}