# rdf-store-ldp

[![Build Status](https://travis-ci.org/rdf-ext/rdf-store-ldp.svg?branch=master)](https://travis-ci.org/rdf-ext/rdf-store-ldp)
[![NPM Version](https://img.shields.io/npm/v/rdf-store-ldp.svg?style=flat)](https://npm.im/rdf-store-ldp)

RESTful LDP RDF Store that follows the [RDF Interface](http://bergos.github.io/rdf-ext-spec/) specification

## Install

```
npm install --save rdf-store-ldp
```

## Usage

Store implementation to access graphs via a RESTful [LDP](http://www.w3.org/TR/ldp/) interface.
The constructor accepts a single `options` parameters.

The `options` object can have the following properties:

* `defaultParser` If the response uses an unknow mime type, that parse is used by default.
  By default 'text/turtle' is used.
* `defaultSerializer` The mime type and serializer used for write requests.
  By default 'text/turtle' is used.
* `parsers` Map that contains mime type to parser function key value pairs.
  By default LdpStore.defaultParsers is used
* `request` Replaces the default request function.
  See the utils sections for implementations provided by RDF-Ext.
* `serializers` Map that contains mime type to serialize function key value pairs.
  By default LdpStore.defaultSerializers is used

## History

Taken from [zazukoians/rdf-ext](https://github.com/zazukoians/rdf-ext)

## Licence

MIT