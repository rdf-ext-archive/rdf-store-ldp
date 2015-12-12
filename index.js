var rdf = require('rdf-ext')
var util = require('util')
var AbstractStore = require('rdf-store-abstract')

require('rdf-formats-common')

function httpSuccess (statusCode) {
  return (statusCode >= 200 && statusCode < 300)
}

function LdpStore (options) {
  options = options || {}

  this.parsers = options.parsers || rdf.parsers
  this.serializers = options.serializers || rdf.serializers
  this.defaultParser = options.defaultParser || 'text/turtle'
  this.defaultSerializer = options.defaultSerializer || 'text/turtle'
  this.defaultPatchSerializer = options.defaultPatchSerializer || options.defaultSerializer || 'text/turtle'
  this.request = options.request || rdf.defaultRequest
}

util.inherits(LdpStore, AbstractStore)

LdpStore.prototype.add = function (iri, graph, callback, options) {
  var self = this

  return new Promise(function (resolve, reject) {
    callback = callback || function () {}
    options = options || {}

    var method = 'PUT'
    var contentType = self.defaultSerializer
    var headers = {}

    headers['Content-Type'] = contentType

    if (options.method) {
      method = options.method
    }

    if (options.etag) {
      headers['If-Match'] = options.etag
    }

    if (options.useEtag && graph.etag) {
      headers['If-Match'] = graph.etag
    }

    self.serializers.serialize(contentType, graph).then(function (data) {
      return self.request(method, iri, headers, data).then(function (res) {
        if (!httpSuccess(res.statusCode)) {
          callback('status code error: ' + res.statusCode)
          return Promise.reject('status code error: ' + res.statusCode)
        }

        callback(null, graph)
        resolve(graph)
      })
    }).catch(function (error) {
      callback(error)
      reject(error)
    })
  })
}

LdpStore.prototype.delete = function (iri, callback) {
  var self = this

  return new Promise(function (resolve, reject) {
    callback = callback || function () {}

    self.request('DELETE', iri, {}, null).then(function (res) {
      if (!httpSuccess(res.statusCode)) {
        callback('status code error: ' + res.statusCode)
        return Promise.reject('status code error: ' + res.statusCode)
      }

      callback()
      resolve()
    }).catch(function (error) {
      callback(error)
      reject(error)
    })
  })
}

LdpStore.prototype.graph = function (iri, callback, options) {
  var self = this

  return new Promise(function (resolve, reject) {
    callback = callback || function () {}
    options = options || {}

    self.request('GET', iri, {'Accept': self.parsers.list().join(', ')}).then(function (res) {
      // also test for status code != 0 for local browser requests
      if (!httpSuccess(res.statusCode) && res.statusCode !== 0) {
        callback('status code error: ' + res.statusCode)
        return Promise.reject('status code error: ' + res.statusCode)
      }

      var contentType

      if (options.contentType) {
        contentType = options.contentType
      } else {
        if ('content-type' in res.headers) {
          contentType = res.headers['content-type'].split(';')[0]
        }

        if (!contentType || !(contentType in self.parsers)) {
          contentType = self.defaultParser
        }
      }

      return self.parsers.parse(contentType, res.content, null, iri).then(function (graph) {
        // copy etag header to Graph object
        if (options.useEtag && 'etag' in res.headers) {
          graph.etag = res.headers.etag
        }

        callback(null, graph)
        resolve(graph)
      })
    }).catch(function (error) {
      callback(error)
      reject(error)
    })
  })
}

LdpStore.prototype.merge = function (iri, graph, callback, options) {
  var self = this

  return new Promise(function (resolve, reject) {
    var contentType = self.defaultPatchSerializer
    var headers = {}

    callback = callback || function () {}
    options = options || {}

    headers['Content-Type'] = contentType

    if ('etag' in options) {
      headers['If-Match'] = options.etag
    }

    if ('useEtag' in options && options.useEtag && 'etag' in graph) {
      headers['If-Match'] = graph.etag
    }

    self.serializers.serialize(contentType, graph).then(function (data) {
      return self.request('PATCH', iri, headers, data).then(function (res) {
          if (!httpSuccess(res.statusCode)) {
            callback('status code error: ' + res.statusCode)
            return Promise.reject('status code error: ' + res.statusCode)
          }

          callback(null, graph)
          resolve(graph)
        }
      )
    }).catch(function (error) {
      callback(error)
      reject(error)
    })
  })
}

module.exports = LdpStore
