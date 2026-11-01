package com.phonespace66.companion.gallery

import android.content.Context
import android.util.Log
import com.phonespace66.companion.protocol.GalleryItem
import com.phonespace66.companion.protocol.GalleryListResponsePayload
import com.phonespace66.companion.storage.AndroidStorageManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.URLEncoder

/**
 * Discovers and indexes photos and videos across phone storage.
 */
class GalleryManager(
    private val context: Context,
    private val storageManager: AndroidStorageManager
) {

    companion object {
        private const val TAG = "GalleryManager"
        private val IMAGE_EXTENSIONS = setOf("jpg", "jpeg", "png", "webp", "gif", "bmp", "heic")
        private val VIDEO_EXTENSIONS = setOf("mp4", "mkv", "mov", "webm", "avi", "3gp")
    }

    suspend fun getGalleryItems(
        category: String? = "all",
        limit: Int = 100,
        offset: Int = 0
    ): GalleryListResponsePayload = withContext(Dispatchers.IO) {
        val root = File("/storage/emulated/0")
        val scanDirs = listOf(
            File(root, "DCIM"),
            File(root, "Pictures"),
            File(root, "Movies"),
            File(root, "Download")
        )

        val allMedia = mutableListOf<File>()

        for (dir in scanDirs) {
            if (dir.exists() && dir.isDirectory) {
                scanMediaRecursive(dir, allMedia, maxDepth = 3)
            }
        }

        // Sort latest first
        allMedia.sortByDescending { it.lastModified() }

        val cat = category?.lowercase()?.trim() ?: "all"
        val filtered = allMedia.filter { file ->
            val ext = file.extension.lowercase()
            val name = file.name.lowercase()
            val path = file.absolutePath.lowercase()

            when (cat) {
                "camera" -> path.contains("/dcim")
                "screenshots" -> path.contains("screenshot") || name.contains("screenshot")
                "videos" -> VIDEO_EXTENSIONS.contains(ext)
                else -> true
            }
        }

        val paged = filtered.drop(offset).take(limit)

        val items = paged.map { file ->
            val ext = file.extension.lowercase()
            val isVideo = VIDEO_EXTENSIONS.contains(ext)
            val mimeType = when (ext) {
                "jpg", "jpeg" -> "image/jpeg"
                "png" -> "image/png"
                "webp" -> "image/webp"
                "gif" -> "image/gif"
                "mp4" -> "video/mp4"
                "mkv" -> "video/x-matroska"
                else -> if (isVideo) "video/*" else "image/*"
            }

            val encodedPath = URLEncoder.encode(file.absolutePath, "UTF-8")
            GalleryItem(
                id = "media-${file.name}-${file.lastModified()}",
                path = file.absolutePath,
                name = file.name,
                mimeType = mimeType,
                sizeBytes = file.length(),
                modifiedAt = file.lastModified(),
                durationMs = if (isVideo) 60000L else null,
                thumbnailUrl = "/thumbnail?path=$encodedPath",
                downloadUrl = "/download?path=$encodedPath"
            )
        }

        GalleryListResponsePayload(
            items = items,
            totalCount = filtered.size,
            category = cat
        )
    }

    private fun scanMediaRecursive(dir: File, result: MutableList<File>, maxDepth: Int) {
        if (maxDepth <= 0) return
        val files = dir.listFiles() ?: return

        for (f in files) {
            if (f.name.startsWith(".")) continue
            if (f.isDirectory) {
                scanMediaRecursive(f, result, maxDepth - 1)
            } else {
                val ext = f.extension.lowercase()
                if (IMAGE_EXTENSIONS.contains(ext) || VIDEO_EXTENSIONS.contains(ext)) {
                    result.add(f)
                }
            }
        }
    }
}
