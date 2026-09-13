import Foundation

/// Intercepts URLSession requests in tests and answers with queued responses.
final class StubURLProtocol: URLProtocol, @unchecked Sendable {
    struct Stub: Sendable {
        let status: Int
        let body: String
        /// When set, the stub only answers requests whose path ends with it (otherwise FIFO).
        var path: String? = nil
    }

    private static let lock = NSLock()
    nonisolated(unsafe) private static var queue: [Stub] = []
    nonisolated(unsafe) private(set) static var requests: [URLRequest] = []

    static func reset(_ stubs: [Stub]) {
        lock.withLock {
            queue = stubs
            requests = []
        }
    }

    static func recordedRequests() -> [URLRequest] {
        lock.withLock { requests }
    }

    static func makeSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        return URLSession(configuration: configuration)
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let stub: Stub? = Self.lock.withLock {
            Self.requests.append(request)
            let requestPath = request.url?.path ?? ""
            guard let index = Self.queue.firstIndex(where: { $0.path.map(requestPath.hasSuffix) ?? true }) else { return nil }
            return Self.queue.remove(at: index)
        }
        guard let stub, let url = request.url,
              let response = HTTPURLResponse(url: url, statusCode: stub.status, httpVersion: nil, headerFields: nil) else {
            client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet))
            return
        }
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(stub.body.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

enum Fixtures {
    static func success(_ data: String, path: String? = nil) -> StubURLProtocol.Stub {
        .init(status: 200, body: #"{"success":true,"data":\#(data),"error":null}"#, path: path)
    }

    static func failure(_ status: Int, code: String, message: String = "msg", path: String? = nil) -> StubURLProtocol.Stub {
        .init(status: status, body: #"{"success":false,"data":null,"error":{"code":"\#(code)","message":"\#(message)"}}"#, path: path)
    }

    static let login = success(#"{"token":"fresh-token","username":"2023-1234","expiresAt":"2025-03-10T12:00:00.000Z"}"#)
}
