# Swissup release builder script

> You don't need this module, when you need custom release builder logic:
>
> - generate demo version
> - change archive format
> - anything else...
>
> See [Swissup Node Package](https://github.com/swissup/node-swissup) example.

### Installation

```bash
git clone git@github.com:swissup/gulp-release-builder.git && cd gulp-release-builder
npm install
```

### Standard Usage Examples

```bash
# Run wizard
gulp

# Generate highlight release from master
gulp --module=highlight

# Generate highlight 1.0.0 release with additional modules
gulp --module=swissup/highlight:1.0.0 --additional=testimonials,vendor/package:1.1.0
```
