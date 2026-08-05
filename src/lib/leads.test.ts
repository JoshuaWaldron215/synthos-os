import { describe, expect, it } from "vitest";
import { webHref, webLabel } from "./leads";

describe("webHref", () => {
  it("leaves absolute urls alone", () => {
    expect(webHref("https://acme.com")).toBe("https://acme.com");
    expect(webHref("http://acme.com")).toBe("http://acme.com");
  });

  it("assumes https for bare domains", () => {
    expect(webHref("acme.com")).toBe("https://acme.com");
    expect(webHref("www.acme.com/pricing")).toBe("https://www.acme.com/pricing");
  });

  it("is case-insensitive about the protocol", () => {
    expect(webHref("HTTPS://acme.com")).toBe("HTTPS://acme.com");
  });
});

describe("webLabel", () => {
  it("strips protocol, www and trailing slashes", () => {
    expect(webLabel("https://www.acme.com/")).toBe("acme.com");
    expect(webLabel("http://acme.com//")).toBe("acme.com");
    expect(webLabel("acme.com")).toBe("acme.com");
  });

  it("keeps the path", () => {
    expect(webLabel("https://acme.com/pricing")).toBe("acme.com/pricing");
  });

  it("does not eat a subdomain that merely starts with w", () => {
    expect(webLabel("https://webmail.acme.com")).toBe("webmail.acme.com");
  });
});
