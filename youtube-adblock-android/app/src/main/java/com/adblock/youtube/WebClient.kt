package com.adblock.youtube

import android.content.Context
import android.graphics.Bitmap
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient

class WebClient(
    private val context: Context,
    private val onPageLoadedCallback: ((url: String) -> Unit)? = null
) : WebViewClient() {

    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest?
    ): WebResourceResponse? {
        val url = request?.url?.toString() ?: return null

        if (AdBlockEngine.isAdUrl(url)) {
            // Block ad network request directly at the transport level
            return AdBlockEngine.createEmptyResponse()
        }

        return super.shouldInterceptRequest(view, request)
    }

    override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        // Inject JS and CSS as early as possible
        injectAdBlockers(view)
    }

    override fun onPageFinished(view: WebView?, url: String?) {
        super.onPageFinished(view, url)
        injectAdBlockers(view)
        if (url != null) {
            onPageLoadedCallback?.invoke(url)
        }
    }

    private fun injectAdBlockers(view: WebView?) {
        view?.let { wv ->
            // Inject AdBlock CSS rules
            val cssScript = AdBlockEngine.getAdblockCss(context)
            if (cssScript.isNotEmpty()) {
                wv.evaluateJavascript(cssScript, null)
            }

            // Inject AdBlock JS hooks
            val jsScript = AdBlockEngine.getAdblockJs(context)
            if (jsScript.isNotEmpty()) {
                wv.evaluateJavascript(jsScript, null)
            }
        }
    }
}
