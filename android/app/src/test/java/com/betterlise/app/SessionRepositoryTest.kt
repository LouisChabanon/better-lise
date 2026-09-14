package com.betterlise.app

import com.betterlise.app.data.api.ApiClient
import com.betterlise.app.data.api.ApiError
import com.betterlise.app.data.api.Endpoints
import com.betterlise.app.data.auth.InMemorySecureStore
import com.betterlise.app.data.auth.SessionRepository
import com.betterlise.app.data.auth.SessionRepository.Companion.KEY_PASSWORD
import com.betterlise.app.data.auth.SessionRepository.Companion.KEY_TOKEN
import com.betterlise.app.data.auth.SessionRepository.Companion.KEY_USERNAME
import com.betterlise.app.data.auth.SessionState
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test

class SessionRepositoryTest {
    private lateinit var server: MockWebServer
    private lateinit var client: ApiClient
    private val store = InMemorySecureStore()

    @Before
    fun setUp() {
        server = MockWebServer().apply { start() }
        client = ApiClient(server.url("/").toString())
    }

    @After
    fun tearDown() = server.shutdown()

    private fun signedInStore(withPassword: Boolean) {
        store.set(KEY_TOKEN, "old-token")
        store.set(KEY_USERNAME, "2023-1234")
        if (withPassword) store.set(KEY_PASSWORD, "pw")
    }

    @Test
    fun `sign in stores the token and only remembers the password when asked`() = runTest {
        server.enqueue(Responses.login)
        server.enqueue(Responses.login)
        val session = SessionRepository(client, store)

        session.signIn("2023-1234", "pw", remember = false)
        assertEquals(SessionState.SignedIn("2023-1234"), session.state.value)
        assertEquals("fresh-token", store.get(KEY_TOKEN))
        assertNull(store.get(KEY_PASSWORD))

        session.signIn("2023-1234", "pw", remember = true)
        assertEquals("pw", store.get(KEY_PASSWORD))
    }

    @Test
    fun `restores the signed in state from secure storage`() {
        signedInStore(withPassword = false)
        assertEquals(SessionState.SignedIn("2023-1234"), SessionRepository(client, store).state.value)
    }

    @Test
    fun `silently re-authenticates once when the session expired`() = runTest {
        signedInStore(withPassword = true)
        server.enqueue(Responses.failure(401, "SESSION_EXPIRED"))
        server.enqueue(Responses.login)
        server.enqueue(Responses.success("""{"updated":1}"""))
        val session = SessionRepository(client, store)

        val result = session.send(Endpoints.markGradeOpened("A"))

        assertEquals(1, result.updated)
        assertEquals("fresh-token", store.get(KEY_TOKEN))
        val authHeaders = List(3) { server.takeRequest().getHeader("Authorization") }
        assertEquals(listOf("Bearer old-token", null, "Bearer fresh-token"), authHeaders)
    }

    @Test
    fun `signs out when re-authentication is impossible`() = runTest {
        signedInStore(withPassword = false)
        server.enqueue(Responses.failure(401, "SESSION_EXPIRED"))
        val session = SessionRepository(client, store)

        try {
            session.send(Endpoints.absences())
            fail("Expected SessionExpired")
        } catch (e: ApiError) {
            assertEquals(ApiError.SessionExpired, e)
        }
        assertEquals(SessionState.SignedOut, session.state.value)
        assertNull(store.get(KEY_TOKEN))
    }

    @Test
    fun `does not retry errors a new login cannot fix`() = runTest {
        signedInStore(withPassword = true)
        server.enqueue(Responses.failure(502, "LISE_UNAVAILABLE"))
        val session = SessionRepository(client, store)

        try {
            session.send(Endpoints.absences())
            fail("Expected server error")
        } catch (e: ApiError) {
            assertTrue(e is ApiError.Server)
        }
        assertEquals(1, server.requestCount)
        assertEquals(SessionState.SignedIn("2023-1234"), session.state.value)
    }

    @Test
    fun `sign out clears credentials even when the server is unreachable`() = runTest {
        signedInStore(withPassword = true)
        server.shutdown()
        val session = SessionRepository(client, store)

        session.signOut()

        assertEquals(SessionState.SignedOut, session.state.value)
        assertNull(store.get(KEY_PASSWORD))
    }

    @Test
    fun `delete account calls the API then signs out`() = runTest {
        signedInStore(withPassword = true)
        server.enqueue(Responses.success("""{"deleted":true}"""))
        val session = SessionRepository(client, store)

        session.deleteAccount()

        val request = server.takeRequest()
        assertEquals("DELETE", request.method)
        assertEquals("/api/v1/me", request.path)
        assertEquals(SessionState.SignedOut, session.state.value)
        assertNull(store.get(KEY_TOKEN))
        assertNull(store.get(KEY_PASSWORD))
    }

    @Test
    fun `failed deletion keeps the session`() = runTest {
        signedInStore(withPassword = false)
        server.enqueue(Responses.failure(500, "INTERNAL"))
        val session = SessionRepository(client, store)

        try {
            session.deleteAccount()
            fail("Expected the deletion to throw")
        } catch (_: ApiError) {
        }

        assertEquals(SessionState.SignedIn("2023-1234"), session.state.value)
        assertEquals("old-token", store.get(KEY_TOKEN))
    }
}
