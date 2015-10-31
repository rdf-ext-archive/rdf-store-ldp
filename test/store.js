/* global describe, it */
var mimeTypeUtil = require('rdf-mime-type-util')
var rdf = require('rdf-ext')
var LdpStore = require('../')
var assert = require('assert')

var createClient = function (buildResponse) {
  return function (method, url, headers, content, callback) {
    return new Promise(function (resolve, reject) {
      callback = callback || function () {}

      var res = null

      if (buildResponse) {
        res = buildResponse({
          method: method,
          url: url,
          headers: headers,
          content: content
        })
      }

      res = res || {}
      res.statusCode = res.statusCode !== undefined ? res.statusCode : 200
      res.headers = res.headers || {}
      res.content = res.content || ''

      callback(res.statusCode, res.headers, res.content, res.error)

      if (!res.error) {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          content: res.content
        })
      } else {
        reject(res.error)
      }
    })
  }
}

var createParser = function (buildGraphData) {
  return {
    parse: function (content, callback, base) {
      return new Promise(function (resolve, reject) {
        callback = callback || function () {}

        var graphData = null

        if (buildGraphData) {
          graphData = buildGraphData({
            content: content,
            base: base
          })
        }

        graphData = graphData || {graph: rdf.createGraph()}

        callback(graphData.error, graphData.graph)

        if (!graphData.error) {
          resolve(graphData.graph)
        } else {
          reject(graphData.error)
        }
      })
    }
  }
}

var createSerializer = function (buildSerializedData) {
  return {
    serialize: function (graph, callback) {
      return new Promise(function (resolve, reject) {
        callback = callback || function () {}

        var serializedData = null

        if (buildSerializedData) {
          serializedData = buildSerializedData({
            graph: graph
          })
        }

        serializedData = serializedData || {content: ''}

        callback(serializedData.content, serializedData.error)

        if (!serializedData.error) {
          resolve(serializedData.content)
        } else {
          reject(serializedData.error)
        }
      })
    }
  }
}

describe('LdpStore', function () {
  describe('graph method', function () {
    it('should use HTTP GET method', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.method, 'GET')
        }),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser()
        }),
        defaultParser: '1'
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should build accept header', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.headers.Accept, 'application/ld+json, text/turtle')
        }),
        parsers: new mimeTypeUtil.ParserUtil({
          'application/ld+json': null,
          'text/turtle': createParser()
        })
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should handle request error', function (done) {
      var options = {
        request: createClient(function () {
          return {error: 'error'}
        })
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should handle error status code', function (done) {
      var options = {
        request: createClient(function () {
          return {statusCode: 500}
        })
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should ignore status code 0 (local file system)', function (done) {
      var options = {
        request: createClient(function () {
          return {statusCode: 0}
        }),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser()
        }),
        defaultParser: '1'
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/', function (error, graph) {
        assert(!!graph)
        assert(!error)

        done()
      })
    })

    it('should use default content type if none given', function (done) {
      var options = {
        request: createClient(),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser(function () {
            assert(false)
          }),
          '2': createParser(function () {
            assert(true)
          })
        }),
        defaultParser: '2'
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should use default content type if unknown is given', function (done) {
      var options = {
        request: createClient(function () {
          return {headers: {'content-type': '3'}}
        }),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser(function () {
            assert(false)
          }),
          '2': createParser(function () {
            assert(true)
          })
        }),
        defaultParser: '2'
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should use parser for defined content type', function (done) {
      var options = {
        request: createClient(function () {
          return {headers: {'content-type': '2'}}
        }),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser(function () {
            assert(false)
          }),
          '2': createParser(function () {
            assert(true)
          })
        })
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should ignore content type header if contentType option is used', function (done) {
      var options = {
        request: createClient(function () {
          return {headers: {'content-type': '1'}}
        }),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser(function () {
            assert(false)
          }),
          '2': createParser(function () {
            assert(true)
          })
        })
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/', null, {contentType: '2'}).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should handle parser error', function (done) {
      var options = {
        request: createClient(),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser(function () {
            return {graph: null, error: 'error'}
          })
        }),
        defaultParser: '1'
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should use parsers base parameter', function (done) {
      var options = {
        request: createClient(),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser(function (serializedData) {
            assert.equal(serializedData.base, 'http://example.org/')
          })
        }),
        defaultParser: '1'
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should return a graph object', function (done) {
      var options = {
        request: createClient(),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser()
        }),
        defaultParser: '1'
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/').then(function (graph) {
        assert.equal(typeof graph, 'object')
        assert.equal(graph.length, 0)
        assert.equal(typeof graph.match, 'function')

        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should set eTag property', function (done) {
      var options = {
        request: createClient(function () {
          return {headers: {'etag': 'test'}}
        }),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser()
        }),
        defaultParser: '1'
      }

      var store = new LdpStore(options)

      store.graph('http://example.org/', null, {useEtag: true}).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })
  })

  describe('match method', function () {
    it('should handle error', function (done) {
      var options = {
        request: createClient(function () {
          return {error: 'error'}
        })
      }

      var store = new LdpStore(options)

      store.match(null, null, null, 'http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should forward parameters to graphs .match method', function (done) {
      var options = {
        request: createClient(),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser(function () {
            return {
              graph: {
                match: function (s, p, o) {
                  assert.equal(s, 's')
                  assert.equal(p, 'p')
                  assert.equal(o, 'o')
                }
              }
            }
          })
        }),
        defaultParser: '1'
      }

      var store = new LdpStore(options)

      store.match('s', 'p', 'o', 'http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should return a graph object', function (done) {
      var options = {
        request: createClient(),
        parsers: new mimeTypeUtil.ParserUtil({
          '1': createParser()
        }),
        defaultParser: '1'
      }

      var store = new LdpStore(options)

      store.match(null, null, null, 'http://example.org/').then(function (graph) {
        assert.equal(typeof graph, 'object')
        assert.equal(graph.length, 0)
        assert.equal(typeof graph.match, 'function')

        done()
      }).catch(function (error) {
        done(error)
      })
    })
  })

  describe('add method', function () {
    it('should use HTTP PUT method', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.method, 'PUT')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should use the content type of defaultSerializer', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.headers['Content-Type'], '1')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should use the given HTTP method', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.method, 'POST')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/', null, null, {method: 'POST'}).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should use if-match header if etag is given', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.headers['If-Match'], 'test')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/', null, null, {etag: 'test'}).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should use if-match header if graph has a etag property and useEtag is set', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.headers['If-Match'], 'test')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/', {etag: 'test'}, null, {useEtag: true}).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should not use if-match header if graph has a etag property, but useEtag is not set', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.notEqual(req.headers['If-Match'], 'test')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/', {etag: 'test'}).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should handle serializer error', function (done) {
      var options = {
        request: createClient(),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer(function () {
            return {error: 'error'}
          })
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should handle request error', function (done) {
      var options = {
        request: createClient(function () {
          return {error: 'error'}
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should handle status code error', function (done) {
      var options = {
        request: createClient(function () {
          return {statusCode: 500}
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should return the input graph object', function (done) {
      var options = {
        request: createClient(),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/', 'test').then(function (graph) {
        assert.equal(graph, 'test')

        done()
      }).catch(function (error) {
        done(error)
      })
    })
  })

  describe('merge method', function () {
    it('should use HTTP PATCH method', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.method, 'PATCH')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.merge('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should use SPARQL Update content type', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.headers['Content-Type'], '1')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.merge('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should use if-match header if etag is given', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.headers['If-Match'], 'test')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.merge('http://example.org/', null, null, {etag: 'test'}).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should use if-match header if graph has a etag property and useEtag is set', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.headers['If-Match'], 'test')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.merge('http://example.org/', {etag: 'test'}, null, {useEtag: true}).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should not use if-match header if graph has a etag property, but useEtag is not set', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.notEqual(req.headers['If-Match'], 'test')
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.merge('http://example.org/', {etag: 'test'}).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should handle serializer error', function (done) {
      var options = {
        request: createClient(),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer(function () {
            return {error: 'error'}
          })
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.merge('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should handle request error', function (done) {
      var options = {
        request: createClient(function () {
          return {error: 'error'}
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.merge('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should handle status code error', function (done) {
      var options = {
        request: createClient(function () {
          return {statusCode: 500}
        }),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.merge('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should return the input graph object', function (done) {
      var options = {
        request: createClient(),
        serializers: new mimeTypeUtil.SerializerUtil({
          '1': createSerializer()
        }),
        defaultSerializer: '1'
      }

      var store = new LdpStore(options)

      store.merge('http://example.org/', 'test').then(function (data) {
        assert.equal(data, 'test')

        done()
      }).catch(function (error) {
        done(error)
      })
    })
  })

  describe('delete method', function () {
    it('should use HTTP DELETE method', function (done) {
      var options = {
        request: createClient(function (req) {
          assert.equal(req.method, 'DELETE')
        })
      }

      var store = new LdpStore(options)

      store.delete('http://example.org/').then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })

    it('should handle request error', function (done) {
      var options = {
        request: createClient(function () {
          return {error: 'error'}
        })
      }

      var store = new LdpStore(options)

      store.delete('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })

    it('should handle status code error', function (done) {
      var options = {
        request: createClient(function () {
          return {statusCode: 500}
        })
      }

      var store = new LdpStore(options)

      store.delete('http://example.org/').then(function () {
        done('no error thrown')
      }).catch(function () {
        done()
      })
    })
  })

  describe('example data', function () {
    it('.add should send serialized JSON-LD', function (done) {
      var graph = rdf.createGraph([
        rdf.createTriple(
          rdf.createNamedNode('http://example.org/subject'),
          rdf.createNamedNode('http://example.org/predicate'),
          rdf.createLiteral('object'))])

      var options = {
        request: createClient(function (req) {
          assert.equal(req.content, '[{"@id":"http://example.org/subject","http://example.org/predicate":"object"}]')
        }),
        defaultSerializer: 'application/ld+json'
      }

      var store = new LdpStore(options)

      store.add('http://example.org/', graph).then(function () {
        done()
      }).catch(function (error) {
        done(error)
      })
    })
  })
})
