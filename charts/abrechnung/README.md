# Abrechnung Helm Chart

## Development

Template the chart: In the Chart directory run:
`helm template . -f values.yaml`

Install the chart to your default cluster:
`helm upgrade --create-namespace --namespace abrechnung --install abrechnung . -f values.yaml --debug`