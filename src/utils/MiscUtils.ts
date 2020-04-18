import {Moment} from "moment";

const numberFormat = new Intl.NumberFormat("en-US");

export async function fetchTextFile (url: string) : Promise<string> {
   let response: Response;
   try {
      response = await fetch(url, {mode: "cors"}); } // (server must send "Access-Control-Allow-Origin" header field or have same origin)
    catch (e) {
      console.log("Fetch error:", e);
      throw new Error("Unable to load data file from " + url + ".\n" + e); }
   if (!response.ok) {
      throw new Error("Request failed for " + url); }
   return response.text(); }

export function escapeHtml (s: string) : string {
   let out = "";
   let p2 = 0;
   for (let p = 0; p < s.length; p++) {
      let r: string;
      switch (s.charCodeAt(p)) {
         case 34: r = "&quot;"; break;  // "
         case 38: r = "&amp;" ; break;  // &
         case 39: r = "&#39;" ; break;  // '
         case 60: r = '&lt;'  ; break;  // <
         case 62: r = '&gt;'  ; break;  // >
         default: continue; }
      if (p2 < p) {
         out += s.substring(p2, p); }
      out += r;
      p2 = p + 1; }
   if (p2 == 0) {
      return s; }
   if (p2 < s.length) {
      out += s.substring(p2); }
   return out; }

export function formatNumber (n: number | undefined) : string {
   if (n === undefined || !isFinite(n)) {
      return ""; }
   return numberFormat.format(n).replace(/,/g, "\u202F"); }

export function formatPercent (n: number | undefined, fractionDigits: number) : string {
   if (n === undefined || !isFinite(n)) {
      return ""; }
   return (n * 100).toFixed(fractionDigits) + "%"; }

export function formatDateIso (d: Moment) : string {
   return d.format("YYYY-MM-DD"); }

export async function catchError (f: Function, ...args: any[]) {
   try {
      const r = f(...args);
      if (r instanceof Promise) {
         await r; }}
    catch (error) {
      console.log(error);
      alert("Error: " + error); }}

export function genKeyName (event: KeyboardEvent) : string {
   return (
      (event.altKey   ? "Alt+"   : "") +
      (event.ctrlKey  ? "Ctrl+"  : "") +
      (event.shiftKey && event.key.length > 1 ? "Shift+" : "") +
      (event.metaKey  ? "Meta+"  : "") +
      event.key ); }
