package com.phonespace66.companion.storage

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import com.phonespace66.companion.core.Constants
import com.phonespace66.companion.mirror.ScreenMirrorManager
import com.phonespace66.companion.pairing.PairingManager
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.cio.*
import io.ktor.server.engine.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.utils.io.jvm.javaio.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.MessageDigest

class FileServer(
    private val context: Context,
    private val storageManager: AndroidStorageManager,
    private val pairingManager: PairingManager,
    private val screenMirrorManager: ScreenMirrorManager? = null
) {
    private val TAG = "FileServer"
    private var serverEngine: CIOApplicationEngine? = null

    fun start(port: Int = Constants.DEFAULT_HTTP_PORT) {
        if (serverEngine != null) return

        try {
            serverEngine = embeddedServer(CIO, port = port, host = "0.0.0.0") {
                routing {
                    // Download Endpoint
                    get("/download") {
                        val token = call.request.headers["Authorization"]?.removePrefix("Bearer ")?.trim()
                        if (!pairingManager.validateToken(token)) {
                            call.respond(HttpStatusCode.Unauthorized, "Authentication required")
                            return@get
                        }

                        val rawPath = call.request.queryParameters["path"]
                        if (rawPath.isNullOrBlank()) {
                            call.respond(HttpStatusCode.BadRequest, "Missing path parameter")
                            return@get
                        }

                        val file = File(storageManager.sanitizePath(rawPath))
                        if (!file.exists() || file.isDirectory) {
                            call.respond(HttpStatusCode.NotFound, "File not found or is a directory")
                            return@get
                        }

                        val sha256 = withContext(Dispatchers.IO) {
                            storageManager.calculateSha256(file)
                        }

                        call.response.header(HttpHeaders.ContentDisposition, "attachment; filename=\"${file.name}\"")
                        call.response.header("X-SHA256-Checksum", sha256)
                        call.response.header(HttpHeaders.ContentLength, file.length().toString())

                        call.respondFile(file)
                    }

                    // Upload Endpoint
                    post("/upload") {
                        val token = call.request.headers["Authorization"]?.removePrefix("Bearer ")?.trim()
                        if (!pairingManager.validateToken(token)) {
                            call.respond(HttpStatusCode.Unauthorized, "Authentication required")
                            return@post
                        }

                        val destination = call.request.queryParameters["destination"]
                        val filename = call.request.queryParameters["filename"]
                        val expectedSha256 = call.request.headers["X-SHA256-Checksum"]?.lowercase()

                        if (destination.isNullOrBlank() || filename.isNullOrBlank()) {
                            call.respond(HttpStatusCode.BadRequest, "Missing destination or filename")
                            return@post
                        }

                        val targetDir = File(storageManager.sanitizePath(destination))
                        if (!targetDir.exists()) {
                            targetDir.mkdirs()
                        }

                        val targetFile = File(targetDir, filename)
                        val digest = MessageDigest.getInstance("SHA-256")

                        try {
                            withContext(Dispatchers.IO) {
                                val channel = call.receiveChannel()
                                val inputStream = channel.toInputStream()
                                val outputStream = FileOutputStream(targetFile)

                                val buffer = ByteArray(65536)
                                var bytesRead: Int
                                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                                    digest.update(buffer, 0, bytesRead)
                                    outputStream.write(buffer, 0, bytesRead)
                                }
                                outputStream.flush()
                                outputStream.close()
                                inputStream.close()
                            }

                            val calculatedSha256 = digest.digest().joinToString("") { "%02x".format(it) }

                            if (!expectedSha256.isNullOrBlank() && expectedSha256 != calculatedSha256) {
                                targetFile.delete() // Remove corrupted file
                                call.respond(HttpStatusCode.UnprocessableEntity, "Checksum verification failed")
                                return@post
                            }

                            call.respondText(
                                "{\"success\":true,\"path\":\"${targetFile.absolutePath}\",\"sha256\":\"$calculatedSha256\",\"bytes\":${targetFile.length()}}",
                                ContentType.Application.Json
                            )
                        } catch (e: Exception) {
                            Log.e(TAG, "Error saving uploaded file", e)
                            targetFile.delete()
                            call.respond(HttpStatusCode.InternalServerError, "Upload failed: ${e.message}")
                        }
                    }

                    // Thumbnail Endpoint for Images
                    get("/thumbnail") {
                        val rawPath = call.request.queryParameters["path"]
                        if (rawPath.isNullOrBlank()) {
                            call.respond(HttpStatusCode.BadRequest, "Missing path")
                            return@get
                        }

                        val file = File(storageManager.sanitizePath(rawPath))
                        if (!file.exists() || file.isDirectory) {
                            call.respond(HttpStatusCode.NotFound)
                            return@get
                        }

                        try {
                            val thumbnailBytes = withContext(Dispatchers.IO) {
                                val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                                BitmapFactory.decodeFile(file.absolutePath, bounds)

                                val sampleSize = calculateInSampleSize(bounds, 200, 200)
                                val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }

                                val bitmap = BitmapFactory.decodeFile(file.absolutePath, options)
                                if (bitmap != null) {
                                    val out = ByteArrayOutputStream()
                                    bitmap.compress(Bitmap.CompressFormat.JPEG, 75, out)
                                    bitmap.recycle()
                                    out.toByteArray()
                                } else null
                            }

                            if (thumbnailBytes != null) {
                                call.respondBytes(thumbnailBytes, ContentType.Image.JPEG)
                            } else {
                                call.respond(HttpStatusCode.NotFound)
                            }
                        } catch (e: Exception) {
                            call.respond(HttpStatusCode.InternalServerError)
                        }
                    }

                    // Screen Mirror Live Frame Stream Endpoint
                    get("/screen/stream") {
                        val token = call.request.headers["Authorization"]?.removePrefix("Bearer ")?.trim()
                            ?: call.request.queryParameters["token"]
                        if (!pairingManager.validateToken(token)) {
                            call.respond(HttpStatusCode.Unauthorized, "Authentication required")
                            return@get
                        }

                        if (screenMirrorManager == null || !screenMirrorManager.isStreaming.value) {
                            call.respond(HttpStatusCode.ServiceUnavailable, "Screen mirror is not active")
                            return@get
                        }

                        try {
                            val frameBytes = withContext(Dispatchers.Default) {
                                screenMirrorManager.getLatestFrame()
                            }
                            call.response.header("Cache-Control", "no-cache, no-store, must-revalidate")
                            call.response.header("Pragma", "no-cache")
                            call.response.header("X-Frame-Timestamp", System.currentTimeMillis().toString())
                            call.respondBytes(frameBytes, ContentType.Image.JPEG)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to deliver screen mirror frame", e)
                            call.respond(HttpStatusCode.InternalServerError, "Frame encoding error")
                        }
                    }
                }
            }.start(wait = false)
            Log.i(TAG, "File HTTP server started on port $port")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start file server on port $port", e)
        }
    }

    fun stop() {
        try {
            serverEngine?.stop(1000, 2000)
            serverEngine = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping file server", e)
        }
    }

    private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val (height: Int, width: Int) = options.run { outHeight to outWidth }
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight: Int = height / 2
            val halfWidth: Int = width / 2

            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }
        return inSampleSize
    }
}

