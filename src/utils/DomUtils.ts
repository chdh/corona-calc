// Browser DOM utilities.

import {formatNumber, decodeNumber} from "./MiscUtils";

export function getInputElement (elementId: string) : HTMLInputElement {
   const e = <HTMLInputElement>document.getElementById(elementId);
   if (!e) {
      throw new Error("No HTML element found with ID \"" + elementId + "\"."); }
   return e; }

function getInputElementLabelText (e: HTMLInputElement) : string {
   let s = (e.labels && e.labels.length > 0) ? e.labels[0].textContent || "" : "";
   if (s.length > 0 && s[s.length - 1] == ":") {
      s = s.substring(0, s.length - 1); }
   return s; }

function genValidityErrorMsg (e: HTMLInputElement | string) {
   const e2 = (typeof e == "string") ? getInputElement(e) : e;
   const labelText = getInputElementLabelText(e2);
   const info = labelText ? ` with label "${labelText}"` : e2.id ? ` with ID "${e2.id}"` : "";
   return "Invalid value in input field" + info + "."; }

function checkValidity (e: HTMLInputElement) {
   if (!e.checkValidity()) {
      throw new Error(genValidityErrorMsg(e)); }}

export function getValue (elementId: string) : string {
   const e = getInputElement(elementId);
   checkValidity(e);
   return e.value; }

export function getValueNumOpt (elementId: string) : number | undefined {
   const e = getInputElement(elementId);
   checkValidity(e);
   if (e.value == "") {
      return; }
   if (e.type == "number") {
      return e.valueAsNumber; }
   const v = decodeNumber(e.value);
   if (v == undefined) {
      throw new Error(genValidityErrorMsg(e)); }
   return v; }

export function getValueNumReq (elementId: string) : number {
   const v = getValueNumOpt(elementId);
   if (v == undefined) {
      throw new Error(genValidityErrorMsg(elementId)); }
   return v; }

export function setValueNum (elementId: string, n: number | undefined) {
   const e = getInputElement(elementId);
   if (n == undefined || isNaN(n)) {
      e.value = "";
      return; }
   if (e.type == "number") {
      e.valueAsNumber = n;
      return; }
   e.value = formatNumber(n); }

export function addNumericFieldFormatSwitcher (elementId: string) {
   const e = getInputElement(elementId);
   e.addEventListener("focusin", () => {
      const n = decodeNumber(e.value);
      if (n != undefined) {
         e.value = String(n); }});
   e.addEventListener("focusout", () => {
      const n = decodeNumber(e.value);
      if (n != undefined) {
         e.value = formatNumber(n); }}); }

export function getChecked (elementId: string) : boolean {
   return getInputElement(elementId).checked; }
