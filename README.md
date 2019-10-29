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
# Generate two highlight releases: with and without subscription checker
gulp --package=swissup/highlight:1.0.0
```

### Advanced Usage Examples

Description | Command
------------|--------
Make release without subscription checker | `gulp --package=swissup/highlight:1.0.0 --nochecker`
Make release with additional modules | `gulp --package=swissup/highlight:1.0.0 --additional=swissup/ajaxsearch:1.0.0`
Make releases for multiple modules at once | `gulp --package=swissup/highlight:1.0.0,swissup/ajaxsearch:1.0.0`
Show help | `gulp help`
