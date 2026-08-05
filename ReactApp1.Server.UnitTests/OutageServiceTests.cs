using Microsoft.Extensions.Options;
using ReactApp1.Server.Dtos;
using ReactApp1.Server.Infrastructure.Http;
using RichardSzalay.MockHttp;
using System.Net;

namespace ReactApp1.Server.UnitTests
{
    public class OutageServiceTests
    {
        private OutageService _sut;
        private MockHttpMessageHandler _handlerMock = new();
        private HttpClient _clientMock;

        public OutageServiceTests()
        {
            _clientMock = _handlerMock.ToHttpClient();
            _clientMock.BaseAddress = new Uri("https://centerpoint.datacapable.com/*");
            _sut = new OutageService(_clientMock);
        }

        [Fact]
        public async Task OutageService_ReceivesHttpStatusCodeNot2xx_ThrowException()
        {
            var json = """
                        {
                            "message": "Resource Not Found!"
                        }
                        """;

            _handlerMock.When("https://centerpoint.datacapable.com/*")
                    .Respond(HttpStatusCode.NotFound, "application/json", json);

            await Assert.ThrowsAsync<HttpRequestException>(() => _sut.GetOutageData());
        }

        [Fact]
        public async Task OutageService_ReceivesHttpStatusCode2xx_ReturnsDto()
        {
            var outageFixture = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Fixtures", "events.json"));

            _handlerMock.When("https://centerpoint.datacapable.com/*")
                   .Respond(HttpStatusCode.OK, "application/json", outageFixture);

            var result = await _sut.GetOutageData();

            Assert.IsType<List<OutageDataDto>>(result);
        }
    }
}
