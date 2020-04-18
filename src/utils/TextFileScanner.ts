// A simple text file scanner for tabular data files (e.g. CSV files).

export class Scanner {

   private text:             string;                       // text file content
   private fieldSeparator:   string;                       // field separator character
   private fieldSepCharCode: number;                       // character code of field separator
   private pos:              number;                       // current position within the text file
   public  lineNo:           number;                       // current line number
   private lineStartPos:     number;                       // start position of current line

   constructor (text: string, fieldSeparator: string) {
      this.text = text;
      this.fieldSeparator = fieldSeparator;
      this.fieldSepCharCode = fieldSeparator.charCodeAt(0);
      this.pos = 0;
      this.lineNo = 1;
      this.lineStartPos = 0; }

   // Returns `true` at end-of-file.
   public eof() : boolean {
      return this.pos >= this.text.length; }

   // Returns `true` at end-of-line.
   public eol() : boolean {
      const c = this.peekCharCode();
      return isEolCharCode(c) || this.eof(); }

   public peekChar() : string {
      return (this.pos < this.text.length) ? this.text[this.pos] : ""; }

   public peekCharCode() : number {
      return this.text.charCodeAt(this.pos); }             // returns NaN at EOF

   public skipBlanks() {
      let p = this.pos;
      while (p < this.text.length && this.text.charCodeAt(p) == 32) {
         p++; }
      this.pos = p; }

   // Skips past the next end-of-line mark. Moves the current position to the start of the next line.
   public skipEol() {
      let p = this.pos;
      while (true) {
         if (p >= this.text.length) {                      // EOF
            this.pos = p;
            return; }
         const c = this.text.charCodeAt(p++);
         if (c == 10) {                                    // LF
            break; }
         if (c == 13) {                                    // CR
            if (this.text.charCodeAt(p) == 10) {           // CR + LF
               p++; }
            break; }}
      this.pos = p;
      this.lineNo++;
      this.lineStartPos = p; }

   public verifyAndSkipEol() {
      this.skipBlanks();
      if (!this.eol()) {
         throw this.genSyntaxError("End-of-line expected."); }
      this.skipEol(); }

   public skipFields (n: number) {
      for (let i = 0; i < n; i++) {
         this.scanField(); }}

   private skipFieldSeparatorIfNotEol() {
      this.skipBlanks();
      if (this.eol()) {
         return; }
      if (this.peekChar() != this.fieldSeparator) {
         throw this.genSyntaxError("Field separator expected."); }
      this.pos++; }

   public scanField() : string {
      this.skipBlanks();
      const q = this.peekCharCode();
      if (q == 34 || q == 39) {                            // single or double quote
         return this.scanQuotedField(); }
       else {
         return this.scanSeparatedField(true); }}

   public scanQuotedField() : string {
      this.skipBlanks();
      let p = this.pos;
      const q = this.text.charCodeAt(p);
      if (q != 34 && q != 39) {
         throw this.genSyntaxError("Start quote expected."); }
      p++;
      const p1 = p;
      while (p < this.text.length) {
         const c = this.text.charCodeAt(p);
         if (c == q) {
            break; }
         if (isEolCharCode(c)) {
            throw this.genSyntaxError("End-of-line in quoted field."); }
         p++; }
      if (p >= this.text.length) {
         this.pos = p;
         throw this.genSyntaxError("End quote expected."); }
      const p2 = p;
      p++;
      this.pos = p;
      this.skipFieldSeparatorIfNotEol();
      return this.text.substring(p1, p2); }

   public scanSeparatedField (trimBlanks: boolean) : string {
      if (trimBlanks) {
         this.skipBlanks(); }
      let p = this.pos;
      const p1 = p;
      while (p < this.text.length) {
         const c = this.text.charCodeAt(p);
         if (c == this.fieldSepCharCode || isEolCharCode(c)) {
            break; }
         p++; }
      let p2 = p;
      if (trimBlanks) {
         while (p2 > p1 && this.text[p2 - 1] == " ") {
            p2--; }}
      this.pos = p;
      this.skipFieldSeparatorIfNotEol();
      return this.text.substring(p1, p2); }

   public scanStringFieldOpt() : string | undefined {
      const s = this.scanField();
      return s ? s : undefined; }

   public scanStringFieldReq() : string {
      const s = this.scanStringFieldOpt();
      if (s === undefined) {
         throw this.genSyntaxError("Empty string field."); }
      return s; }

   public scanNumberFieldOpt() : number | undefined {
      const p1 = this.pos;
      const s = this.scanField();
      if (!s) {
         return; }
      const n = Number(s);
      if (!isFinite(n)) {
         this.pos = p1;
         this.skipBlanks();
         throw this.genSyntaxError(`Invalid number "${s}".`); }
      return n; }

   public scanNumberFieldReq() : number {
      const n = this.scanNumberFieldOpt();
      if (n === undefined) {
         throw this.genSyntaxError("Empty numeric field."); }
      return n; }

   public scanNumberField (defaultValue: number) : number {
      const n = this.scanNumberFieldOpt();
      return (n === undefined) ? defaultValue : n; }

   public scanFloat64Array (n: number) : Float64Array {
      const a = new Float64Array(n);
      for (let i = 0; i < n; i++) {
         a[i] = this.scanNumberFieldReq(); }
      return a; }

   public genSyntaxError (msg: string) : Error {
      return new Error("Syntax error at line " + this.lineNo + " column " + (this.pos - this.lineStartPos + 1) + ": " + msg); }}

function isEolCharCode (c: number) {
   return c == 13 || c == 10; }
