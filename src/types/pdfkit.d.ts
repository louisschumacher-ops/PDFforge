// @types/pdfkit only types `link(...)`'s url parameter as `string`, but PDFKit's
// runtime implementation (see pdfkit/js/pdfkit.js `link()`) also accepts a
// numeric page index to create an internal "jump to page" annotation, which is
// exactly what cross-page continuation links need. This augments the upstream
// type as an overload instead of casting to `any` at every call site.
declare namespace PDFKit.Mixins {
  interface PDFAnnotation {
    link(
      x: number,
      y: number,
      w: number,
      h: number,
      pageIndex: number,
      option?: AnnotationOption,
    ): this;
  }
}
