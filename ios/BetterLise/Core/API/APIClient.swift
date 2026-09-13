import Foundation

/// Low-level HTTP client for the Better Lise `/api/v1` API.
final class APIClient: Sendable {
    private let baseURL: URL
    private let session: URLSession

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let raw = try String(from: decoder)
            if let date = DateParsing.iso8601(raw) { return date }
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath, debugDescription: "Invalid ISO-8601 date: \(raw)")
            )
        }
        return decoder
    }()

    func send<T: Decodable>(_ endpoint: Endpoint<T>, token: String?) async throws -> T {
        let request = try makeRequest(endpoint, token: token)

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.network(error.localizedDescription)
        }

        let envelope: APIEnvelope<T>
        do {
            envelope = try Self.decoder.decode(APIEnvelope<T>.self, from: data)
        } catch {
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw status >= 500 ? APIError.server(code: "HTTP_\(status)", message: "") : APIError.decoding
        }

        if let errorBody = envelope.error {
            throw APIError(body: errorBody)
        }
        guard envelope.success, let payload = envelope.data else {
            throw APIError.decoding
        }
        return payload
    }

    func makeRequest<T>(_ endpoint: Endpoint<T>, token: String?) throws -> URLRequest {
        // Endpoint paths are already percent-encoded: set them verbatim to avoid double encoding
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw APIError.network("URL invalide")
        }
        let basePath = components.percentEncodedPath.hasSuffix("/")
            ? String(components.percentEncodedPath.dropLast())
            : components.percentEncodedPath
        components.percentEncodedPath = "\(basePath)/api/v1/\(endpoint.path)"
        if !endpoint.query.isEmpty {
            components.queryItems = endpoint.query
        }
        guard let finalURL = components.url else {
            throw APIError.network("URL invalide")
        }

        var request = URLRequest(url: finalURL)
        request.httpMethod = endpoint.method.rawValue
        request.timeoutInterval = 45 // Lise scraping can be slow
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body = endpoint.body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if endpoint.requiresAuth, let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }
}

enum DateParsing {
    private static let fractional = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
    private static let plain = Date.ISO8601FormatStyle()

    static func iso8601(_ value: String) -> Date? {
        (try? fractional.parse(value)) ?? (try? plain.parse(value))
    }

    /// Parses Lise's `dd/MM/yyyy` dates.
    static func liseDay(_ value: String) -> Date? {
        let parts = value.split(separator: "/").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return Calendar.paris.date(from: DateComponents(year: parts[2], month: parts[1], day: parts[0]))
    }
}

extension Calendar {
    static let paris: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Europe/Paris") ?? .current
        calendar.locale = Locale(identifier: "fr_FR")
        calendar.firstWeekday = 2
        return calendar
    }()
}
