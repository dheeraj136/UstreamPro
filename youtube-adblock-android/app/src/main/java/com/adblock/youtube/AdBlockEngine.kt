package com.adblock.youtube

import android.content.Context
import android.net.Uri
import android.util.Base64
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.io.InputStream
import java.nio.charset.StandardCharsets

object AdBlockEngine {

    private val AD_HOSTS = hashSetOf(
        "doubleclick.net",
        "googleads.g.doubleclick.net",
        "pubads.g.doubleclick.net",
        "securepubads.g.doubleclick.net",
        "pagead2.googlesyndication.com",
        "adservice.google.com",
        "fls-na.amazon-adsystem.com",
        "static.doubleclick.net"
    )

    private val AD_URL_KEYWORDS = arrayOf(
        "/pagead/",
        "/ptracking",
        "/api/stats/ads",
        "/api/stats/qoe?adformat",
        "/youtubei/v1/att/get",
        "doubleclick.net",
        "googleadservices.com"
    )

    private var cachedJs: String? = null
    private var cachedCss: String? = null

    fun isAdUrl(url: String): Boolean {
        try {
            val uri = Uri.parse(url)
            val host = uri.host?.lowercase() ?: return false

            for (adHost in AD_HOSTS) {
                if (host == adHost || host.endsWith(".$adHost")) {
                    return true
                }
            }

            for (keyword in AD_URL_KEYWORDS) {
                if (url.contains(keyword, ignoreCase = true)) {
                    return true
                }
            }
        } catch (_: Exception) {}
        return false
    }

    fun createEmptyResponse(): WebResourceResponse {
        return WebResourceResponse(
            "text/plain",
            "UTF-8",
            204,
            "No Content",
            mapOf("Access-Control-Allow-Origin" to "*"),
            ByteArrayInputStream(ByteArray(0))
        )
    }

    fun getAdblockJs(context: Context): String {
        if (cachedJs != null) return cachedJs!!
        cachedJs = try {
            context.assets.open("adblock.js").bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            ""
        }
        return cachedJs!!
    }

    fun getAdblockCss(context: Context): String {
        if (cachedCss != null) return cachedCss!!
        cachedCss = try {
            val css = context.assets.open("adblock.css").bufferedReader().use { it.readText() }
            val encoded = Base64.encodeToString(css.toByteArray(StandardCharsets.UTF_8), Base64.NO_WRAP)
            """
            (function() {
                var parent = document.head || document.documentElement;
                var style = document.getElementById('adblock-css-injection');
                if (!style) {
                    style = document.createElement('style');
                    style.id = 'adblock-css-injection';
                    style.type = 'text/css';
                    style.innerHTML = window.atob('$encoded');
                    parent.appendChild(style);
                }
            })();
            """.trimIndent()
        } catch (e: Exception) {
            ""
        }
        return cachedCss!!
    }
}
