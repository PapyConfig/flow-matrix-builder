FROM nginx:alpine

# Remove default nginx site
RUN rm -rf /usr/share/nginx/html/*

# Copy static site
COPY index.html /usr/share/nginx/html/
COPY src/ /usr/share/nginx/html/src/

# Custom nginx config for SPA + proper caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
