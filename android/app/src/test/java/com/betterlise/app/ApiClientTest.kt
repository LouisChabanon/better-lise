package com.betterlise.app

import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.api.ApiError
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.api.EventKind
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import java.time.Instant

class ApiClientTest {
    private lateinit var server: MockWebServer
    private lateinit var client: ApiClient

    @Before
    fun setUp() {
        server = MockWebServer().apply { start() }
        client = ApiClient(server.url("/").toString())
    }

    @After
    fun tearDown() = server.shutdown()

    private suspend fun expectError(block: suspend () -> Unit): ApiError {
        try {
            block()
        } catch (e: ApiError) {
            return e
        }
        fail("Expected ApiError")
        error("unreachable")
    }

    @Test
    fun `decodes agenda events and builds the query`() = runTest {
        server.enqueue(
            Responses.success(
                """{"events":[{"title":"MATA","startDate":"2025-03-10T07:00:00.000Z","endDate":"2025-03-10T09:00:00Z","room":"A1","type":"CM","isAllDay":false,"extra":1}]}""",
            ),
        )

        val response = client.send(Endpoints.agenda("2023-1234", "Cluny", includeRu = true), token = "ignored")

        assertEquals(EventKind.Lecture, response.events.single().kind)
        assertEquals(Instant.parse("2025-03-10T07:00:00Z"), response.events.single().startDate)
        val request = server.takeRequest()
        assertEquals("/api/v1/agenda?liseId=2023-1234&tbk=Cluny&ru=true", request.path)
        assertNull("public endpoints never send the token", request.getHeader("Authorization"))
    }

    @Test
    fun `sends bearer token, JSON bodies and encoded path segments`() = runTest {
        server.enqueue(Responses.login)
        server.enqueue(Responses.success("""{"avg":12,"min":2,"max":19,"count":30,"median":12.5,"stdDeviation":3.1,"distribution":{"labels":["0-2"],"counts":[1]}}"""))
        server.enqueue(Responses.success("""{"username":"2023-1234","class":"GIM2","tbk":null,"currentStreak":2}"""))

        client.send(Endpoints.login("2023-1234", "p@ss"), token = null)
        val login = server.takeRequest()
        assertEquals("POST", login.method)
        assertEquals("""{"username":"2023-1234","password":"p@ss"}""", login.body.readUtf8())

        val stats = client.send(Endpoints.gradeStats("FITE S7/MATA"), token = "abc")
        assertEquals(30, stats.count)
        val statsRequest = server.takeRequest()
        assertEquals("/api/v1/grades/FITE%20S7%2FMATA/stats", statsRequest.path)
        assertEquals("Bearer abc", statsRequest.getHeader("Authorization"))

        val profile = client.send(Endpoints.updateProfile(promo = "GIM2", tbk = null), token = "abc")
        assertEquals("GIM2", profile.promo)
        assertEquals("""{"class":"GIM2"}""", server.takeRequest().body.readUtf8())
    }

    @Test
    fun `maps API and transport errors`() = runTest {
        server.enqueue(Responses.failure(401, "SESSION_EXPIRED"))
        server.enqueue(Responses.failure(429, "RATE_LIMITED", "Trop de tentatives"))
        server.enqueue(Responses.failure(502, "LISE_UNAVAILABLE"))
        server.enqueue(MockResponse().setResponseCode(500).setBody("<html>oops</html>"))
        server.enqueue(MockResponse().setResponseCode(200).setBody("not json"))

        assertEquals(ApiError.SessionExpired, expectError { client.send(Endpoints.absences(), "t") })
        assertEquals(ApiError.RateLimited("Trop de tentatives"), expectError { client.send(Endpoints.absences(), "t") })
        assertEquals(ApiError.Server("LISE_UNAVAILABLE", "msg"), expectError { client.send(Endpoints.absences(), "t") })
        assertEquals(ApiError.Server("HTTP_500", ""), expectError { client.send(Endpoints.absences(), "t") })
        assertEquals(ApiError.Decoding, expectError { client.send(Endpoints.absences(), "t") })

        server.shutdown()
        assertTrue(expectError { client.send(Endpoints.absences(), "t") } is ApiError.Network)
    }
}
