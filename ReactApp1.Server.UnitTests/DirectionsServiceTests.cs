using Microsoft.Extensions.Options;
using ReactApp1.Server.Dtos;
using ReactApp1.Server.Infrastructure.Http;
using RichardSzalay.MockHttp;
using System.Net;

namespace ReactApp1.Server.UnitTests
{
    public class DirectionsServiceTests
    {
        private DirectionsService _sut;
        private MockHttpMessageHandler _handlerMock = new();
        private HttpClient _clientMock;
        private readonly IOptions<MapboxOptions> _options = Options.Create(new MapboxOptions
        {
            MapboxToken = "pk.1"
        });

        public DirectionsServiceTests ()
        {
            _clientMock = _handlerMock.ToHttpClient();
            _clientMock.BaseAddress = new Uri("https://api.mapbox.com/directions/v5/mapbox/driving-traffic/*");
            _sut = new DirectionsService(_clientMock, _options);
        }

        [Fact]
        public async Task DirectionsService_ReceivesHttpStatusCodeNot2xx_ThrowException()
        {
            var json = """
                        {
                            "message": "Resource Not Found!"
                        }
                        """;

            _handlerMock.When("https://api.mapbox.com/directions/v5/mapbox/driving-traffic/*")
                    .Respond(HttpStatusCode.NotFound, "application/json", json);

           await Assert.ThrowsAsync<HttpRequestException>(() => _sut.GetDirections("-95.3698;29.7604"));
        }

        [Fact]
        public async Task DirectionsService_ReceivesHttpStatusCode2xx_ReturnsDto()
        {
            var json = """
                       {

                            "name": "value"
                       }
                       """;

            _handlerMock.When("https://api.mapbox.com/directions/v5/mapbox/driving-traffic/*")
                   .Respond(HttpStatusCode.OK, "application/json", json);

            var result = await _sut.GetDirections("-95.3698;29.7604");

            Assert.IsType<DirectionsResponseDto>(result);
        }
    }
}