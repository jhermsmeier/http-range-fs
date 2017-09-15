var util = require( 'util' )
var HttpFs = require( '..' )
var UDIF = require( 'udif' )

function inspect( value ) {
  return util.inspect( value, {
    depth: null, colors: process.stdout.isTTY,
  })
}

var filename = '/resin-io/etcher/releases/download/v1.0.0/Etcher-1.0.0-darwin-x64.dmg'
var options = {
  fs: new HttpFs({
    baseUrl: 'https://github.com/',
  })
}

var image = new UDIF.Image( filename, options )

image.open( function( error ) {

  console.log( error || inspect( image ) )
  console.log( '  compressed size:', image.footer.dataForkLength / 1024 / 1024, 'MB' )
  console.log( 'uncompressed size:', image.getUncompressedSize() / 1024 / 1024, 'MB' )

  var readStream = image.createReadStream( options )
    .on( 'error', ( error ) => console.log( error ) )
    .on( 'readable', function() {
      var chunk = null
      var chunksRead = 0
      while( chunk = this.read() ) {
        chunksRead++
      }
      console.log( 'read', chunksRead, 'chunks' )
    })
    .on( 'end', () => console.log( '[OK] Done' ))

})

// // var fs = new HttpFs({
// //   baseUrl: 'https://github.com/',
// // })

// fs.open( filename, ( error, fd ) => {

//   console.log( 'open:', error || fd )

//   var offset = 0
//   var length = 15
//   var position = 15
//   var buffer = Buffer.alloc( length )

//   fs.read( fd, buffer, offset, length, position, ( error, bytesRead, buffer ) => {
//     console.log( 'read:', error, bytesRead, buffer )
//     console.log( 'read:', buffer && buffer.toString() )
//   })

//   // offset = 0
//   // length = 16
//   // position = 32
//   // buffer = Buffer.alloc( length )

//   // fs.read( fd, buffer, offset, length, position, ( error, bytesRead, buffer ) => {
//   //   console.log( 'read:', error, bytesRead, buffer )
//   //   console.log( 'read:', buffer && buffer.toString() )
//   // })

// })
