/// <reference types="astro/client" />
declare const __PRIMER_VERSION__: string;
declare namespace App {
  interface Locals {
    /** Note and citation numbers for the page being rendered, in order of first appearance. */
    noteNumbers?: Map<string, number>;
    citeNumbers?: Map<string, number>;
  }
}
