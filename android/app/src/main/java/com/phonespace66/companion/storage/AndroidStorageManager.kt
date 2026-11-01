package com.phonespace66.companion.storage

import android.content.Context
import android.os.Environment
import android.webkit.MimeTypeMap
import com.phonespace66.companion.protocol.FileItem
import com.phonespace66.companion.protocol.StorageListResponsePayload
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.Locale

class AndroidStorageManager(private val context: Context) {

    val rootPath: String by lazy {
        Environment.getExternalStorageDirectory().absolutePath
    }

    fun listDirectory(
        rawPath: String,
        sortBy: String = "name",
        sortOrder: String = "asc"
    ): StorageListResponsePayload {
        val targetPath = sanitizePath(rawPath)
        val directory = File(targetPath)

        if (!directory.exists() || !directory.isDirectory) {
            throw IllegalArgumentException("Path does not exist or is not a directory: $targetPath")
        }

        val files = directory.listFiles() ?: emptyArray()
        val items = files.map { file ->
            val ext = file.extension.lowercase(Locale.ROOT)
            val mimeType = getMimeType(file, ext)

            FileItem(
                name = file.name,
                path = file.absolutePath,
                isDirectory = file.isDirectory,
                sizeBytes = if (file.isDirectory) 0L else file.length(),
                modifiedAt = file.lastModified(),
                mimeType = mimeType,
                extension = ext,
                isWritable = file.canWrite()
            )
        }

        val sorted = when (sortBy.lowercase()) {
            "size" -> if (sortOrder == "desc") items.sortedByDescending { it.sizeBytes } else items.sortedBy { it.sizeBytes }
            "date" -> if (sortOrder == "desc") items.sortedByDescending { it.modifiedAt } else items.sortedBy { it.modifiedAt }
            "type" -> if (sortOrder == "desc") items.sortedByDescending { it.extension } else items.sortedBy { it.extension }
            else -> if (sortOrder == "desc") items.sortedByDescending { it.name.lowercase() } else items.sortedBy { it.name.lowercase() }
        }

        // Directories first, then files
        val organized = sorted.sortedByDescending { it.isDirectory }

        val parent = if (directory.absolutePath == rootPath) null else directory.parent

        return StorageListResponsePayload(
            currentPath = directory.absolutePath,
            parentPath = parent,
            entries = organized,
            totalEntries = organized.size
        )
    }

    fun createDirectory(parentPath: String, folderName: String): String {
        val safeParent = sanitizePath(parentPath)
        val cleanName = folderName.replace(Regex("[/\\\\:*?\"<>|]"), "_").trim()
        val target = File(safeParent, cleanName)

        if (target.exists()) {
            throw IllegalStateException("Folder already exists: ${target.name}")
        }
        if (!target.mkdirs()) {
            throw IllegalStateException("Failed to create folder: ${target.name}")
        }
        return target.absolutePath
    }

    fun renameFile(targetPath: String, newName: String): String {
        val file = File(sanitizePath(targetPath))
        if (!file.exists()) throw IllegalArgumentException("File not found: $targetPath")

        val cleanName = newName.replace(Regex("[/\\\\:*?\"<>|]"), "_").trim()
        val dest = File(file.parentFile, cleanName)

        if (dest.exists()) {
            throw IllegalStateException("Destination file already exists: $cleanName")
        }
        if (!file.renameTo(dest)) {
            throw IllegalStateException("Failed to rename file to: $cleanName")
        }
        return dest.absolutePath
    }

    fun deleteFile(targetPath: String): Boolean {
        val file = File(sanitizePath(targetPath))
        if (!file.exists()) return true

        return if (file.isDirectory) {
            file.deleteRecursively()
        } else {
            file.delete()
        }
    }

    fun calculateSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { fis ->
            val buffer = ByteArray(65536)
            var bytesRead: Int
            while (fis.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    fun sanitizePath(input: String?): String {
        if (input.isNullOrBlank() || input == "/" || input == "~") {
            return rootPath
        }
        val file = File(input)
        val canonical = file.canonicalPath

        // Basic boundary verification: ensure user does not escape into restricted system root
        if (!canonical.startsWith("/storage") && !canonical.startsWith(rootPath)) {
            return rootPath
        }
        return canonical
    }

    private fun getMimeType(file: File, ext: String): String {
        if (file.isDirectory) return "inode/directory"
        val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
        if (!mime.isNullOrBlank()) return mime

        return when (ext) {
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "webp" -> "image/webp"
            "gif" -> "image/gif"
            "mp4" -> "video/mp4"
            "mkv" -> "video/x-matroska"
            "mp3" -> "audio/mpeg"
            "wav" -> "audio/wav"
            "pdf" -> "application/pdf"
            "txt", "log", "md" -> "text/plain"
            "apk" -> "application/vnd.android.package-archive"
            "zip" -> "application/zip"
            else -> "application/octet-stream"
        }
    }
}

