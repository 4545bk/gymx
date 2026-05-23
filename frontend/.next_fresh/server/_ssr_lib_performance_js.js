"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "_ssr_lib_performance_js";
exports.ids = ["_ssr_lib_performance_js"];
exports.modules = {

/***/ "(ssr)/./lib/performance.js":
/*!****************************!*\
  !*** ./lib/performance.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   logSlowCall: () => (/* binding */ logSlowCall)\n/* harmony export */ });\n/**\n * Performance Monitoring Utility — Tracks slow network operations and alerts the UI.\n */ /**\n * Logs a slow API call and dispatches a warning event.\n * @param {string} url - The endpoint URL.\n * @param {number} duration - The request duration in milliseconds.\n */ function logSlowCall(url, duration) {\n    console.warn(`[Performance Warning] Slow API call to \"${url}\" took ${(duration / 1000).toFixed(2)}s`);\n    if (false) {}\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9saWIvcGVyZm9ybWFuY2UuanMiLCJtYXBwaW5ncyI6Ijs7OztBQUFBOztDQUVDLEdBRUQ7Ozs7Q0FJQyxHQUNNLFNBQVNBLFlBQVlDLEdBQUcsRUFBRUMsUUFBUTtJQUN2Q0MsUUFBUUMsSUFBSSxDQUFDLENBQUMsd0NBQXdDLEVBQUVILElBQUksT0FBTyxFQUFFLENBQUNDLFdBQVcsSUFBRyxFQUFHRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEcsSUFBSSxLQUFrQixFQUFhLEVBTWxDO0FBQ0giLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9neW14LWZyb250ZW5kLy4vbGliL3BlcmZvcm1hbmNlLmpzP2NkYjciXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBQZXJmb3JtYW5jZSBNb25pdG9yaW5nIFV0aWxpdHkg4oCUIFRyYWNrcyBzbG93IG5ldHdvcmsgb3BlcmF0aW9ucyBhbmQgYWxlcnRzIHRoZSBVSS5cbiAqL1xuXG4vKipcbiAqIExvZ3MgYSBzbG93IEFQSSBjYWxsIGFuZCBkaXNwYXRjaGVzIGEgd2FybmluZyBldmVudC5cbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgLSBUaGUgZW5kcG9pbnQgVVJMLlxuICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIC0gVGhlIHJlcXVlc3QgZHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nU2xvd0NhbGwodXJsLCBkdXJhdGlvbikge1xuICBjb25zb2xlLndhcm4oYFtQZXJmb3JtYW5jZSBXYXJuaW5nXSBTbG93IEFQSSBjYWxsIHRvIFwiJHt1cmx9XCIgdG9vayAkeyhkdXJhdGlvbiAvIDEwMDApLnRvRml4ZWQoMil9c2ApO1xuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChcbiAgICAgIG5ldyBDdXN0b21FdmVudCgnZ3lteC1zbG93LWNvbm5lY3Rpb24nLCB7XG4gICAgICAgIGRldGFpbDogeyB1cmwsIGR1cmF0aW9uIH0sXG4gICAgICB9KVxuICAgICk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJsb2dTbG93Q2FsbCIsInVybCIsImR1cmF0aW9uIiwiY29uc29sZSIsIndhcm4iLCJ0b0ZpeGVkIiwid2luZG93IiwiZGlzcGF0Y2hFdmVudCIsIkN1c3RvbUV2ZW50IiwiZGV0YWlsIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(ssr)/./lib/performance.js\n");

/***/ })

};
;