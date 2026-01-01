.PHONY: release clean

release:
	npm install
	npm run build
	npm version ${VERSION}
	git push origin ${VERSION}

clean:
	rm -f main.js
	rm -rf node_modules