"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEV_ORIGIN_RE = void 0;
// Origin allowlist regex for local development. embedding.js matches a
// postMessage event's origin against it before accepting the event from the
// dev app.
//
// Matches the dev-proxy hosts (optionally with a `-<suffix>` and a `:<port>`),
// localhost on any port, and the usual Flourish embed domains:
//   localhost:<port>
//   app[-<suffix>].local.flourish-internal.com[:<port>]
//   public[-<suffix>].local.flourish-internal.com[:<port>]
//   flourish-api.com, *.flourish.{local,net,rocks,studio}, *.uri.sh, flourish-user-templates.com
//
// The local.flourish-internal.com hosts are an intentionally permitted entry in
// this allowlist and are shipped as-is in the production embed.js.
exports.DEV_ORIGIN_RE = /\/\/localhost:\d+$|\/\/(?:public|app)(?:-[a-z0-9-]+)?\.local\.flourish-internal\.com(?::\d+)?$|\/\/flourish-api\.com$|\.flourish\.(?:local(:\d+)?|net|rocks|studio)$|\.uri\.sh$|\/\/flourish-user-templates\.com$/;
