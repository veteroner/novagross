export class NextResponse {
  constructor(body, status) { this.body = body; this.status = status }
  static json(body, init = {}) { return new NextResponse(body, init.status ?? 200) }
}
export class NextRequest extends Request {}
