using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using static Microsoft.AspNetCore.WebUtilities.QueryHelpers;

namespace ReactApp1.Server.Infrastructure.Http
{
    public sealed class MapBoxDirections : DelegatingHandler
    {
        private readonly string _token;
        
        public MapBoxDirections(IOptions<MapBoxOptions> opts)
            => _token = opts.Value.Token ?? throw new ArgumentNullException(nameof(opts));
            
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var uri = request.RequestUri;

            var queryString = new Dictionary<string, string?>( )
            {
                ["access_token"] =  _token,
                ["geometries"] = "geojson",
                ["overview"] = "full",
                ["annotations"] = "duration,distance,speed,congestion,congestion_numeric",
                ["steps"] = "true",
            };

            var updated = AddQueryString(uri.ToString(), queryString);
            request.RequestUri = new Uri(updated);

            return base.SendAsync(request, cancellationToken);
        }
    }
       
    public class MapBoxOptions
    {
        public string Token { get; set; }
    }
}