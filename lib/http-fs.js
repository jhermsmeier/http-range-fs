var pkg = require( '../package.json' )
var fs = require( 'fs' )
var os = require( 'os' )
var path = require( 'path' )
var request = require( 'request' )
var debug = require( 'debug' )( 'http-fs' )

class HttpFileSystem {

  constructor( options ) {

    options = options || {}

    this._currentFd = 10
    this._descriptors = {}
    this._paths = {}

    this.baseUrl = options.baseUrl
    this.req = request.defaults({
      gzip: true,
      baseUrl: options.baseUrl,
      encoding: null,
      forever: true,
      strictSSL: true,
      removeRefererHeader: true,
      followRedirect: true,
      followAllRedirects: false,
      headers: {
        'User-Agent': `${pkg.name}/${pkg.version}`
      }
    })

  }

  _getHandleFromDescriptor( fd ) {
    return this._descriptors[ fd ] || null
  }

  _getHandleFromPath( filename ) {
    filename = path.posix.resolve( '/', filename )
    return this._descriptors[ this._paths[ filename ] ] || null
  }

  stat( filename, callback ) {

    var file = this._getHandleFromPath( filename )

    debug( 'stat', file.path )

    if( !file ) {
      return void callback( new Error( 'Invalid file descriptor' ) )
    }

    var req = this.req({
      method: 'GET',
      url: file.location,
      baseUrl: null,
    })

    req.on( 'error', callback )

    req.on( 'response', ( res ) => {

      console.log( res && res.headers )

      if( res.statusCode >= 400 ) {
        return void callback( new Error( `HTTP ${res.statusCode}: ${res.statusMessage}` ) )
      }

      res.destroy()
      req.abort()

      var stats = new fs.Stats()

      stats.size = res.headers['content-length']

      callback( null, stats )

    })

  }

  fstat( fd, callback ) {

    var file = this._getHandleFromDescriptor( fd )

    debug( 'fstat', file.path )

    if( !file ) {
      return void callback( new Error( 'Invalid file descriptor' ) )
    }

    var req = this.req({
      method: 'GET',
      url: file.location,
      baseUrl: null,
    })

    req.on( 'error', callback )

    req.on( 'response', ( res ) => {

      console.log( res && res.headers )

      if( res.statusCode >= 400 ) {
        return void callback( new Error( `HTTP ${res.statusCode}: ${res.statusMessage}` ) )
      }

      res.destroy()
      req.abort()

      var stats = new fs.Stats()

      stats.size = res.headers['content-length']

      callback( null, stats )

    })

  }

  open( filename, flags, mode, callback ) {

    filename = path.posix.resolve( '/', filename )

    debug( 'fstat', filename )

    if( typeof flags === 'function' ) {
      callback = flags
      flags = null
    }

    if( typeof mode === 'function' ) {
      callback = mode
      mode = null
    }

    this.req({
      method: 'HEAD',
      url: filename,
      followRedirect: false,
    }, ( error, res, body ) => {

      // console.log( 'res', res )

      if( error != null ) {
        return void callback( error )
      }

      if( res.statusCode >= 400 ) {
        return void callback( new Error( `HTTP ${res.statusCode}: ${res.statusMessage}` ) )
      }

      var file = {
        fd: this._currentFd++,
        path: filename,
        location: res.headers.location || res.request.href,
        supportsRanges: /bytes/i.test( res.headers['accept-ranges'] ),
      }

      console.log( 'file', file )

      this._descriptors[ file.fd ] = file
      this._paths[ file.path ] = file.fd

      callback( error, file.fd )

    })

  }

  close( fd, callback ) {
    var handle = this._getHandleFromDescriptor( fd )
    debug( 'close', handle.path )
    // this._descriptors[ fd ] = undefined
    // this._paths[ handle.path ] = undefined
    // handle = undefined
    callback()
  }

  read( fd, buffer, offset, length, position, callback ) {

    var file = this._getHandleFromDescriptor( fd )

    debug( 'read', file.path )
    debug( 'read', `bytes=${ position }-${ position + length - 1 }` )

    if( !file ) {
      return void callback( new Error( 'Invalid file descriptor' ) )
    }

    // if( !file.supportsRanges ) {
    //   return void callback( new Error( 'No range support' ) )
    // }

    this.req({
      method: 'GET',
      url: file.location,
      baseUrl: null,
      headers: {
        'Range': `bytes=${ position }-${ position + length - 1 }`
      }
    }, ( error, res, body ) => {

      debug( 'read:response', res && res.headers )
      debug( 'read:response', body )

      if( error != null ) {
        return void callback( error )
      }

      if( res.statusCode >= 400 ) {
        return void callback( new Error( `HTTP ${res.statusCode}: ${res.statusMessage}` ) )
      }

      body.copy( buffer, offset, 0, length )

      callback( error, body.length, buffer )

    })
  }

}

module.exports = HttpFileSystem
