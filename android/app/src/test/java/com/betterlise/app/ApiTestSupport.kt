package com.betterlise.app

import okhttp3.mockwebserver.MockResponse

object Responses {
    fun success(data: String) = MockResponse().setResponseCode(200)
        .setBody("""{"success":true,"data":$data,"error":null}""")

    fun failure(status: Int, code: String, message: String = "msg") = MockResponse().setResponseCode(status)
        .setBody("""{"success":false,"data":null,"error":{"code":"$code","message":"$message"}}""")

    val login = success("""{"token":"fresh-token","username":"2023-1234","expiresAt":"2025-03-10T12:00:00.000Z"}""")
}
