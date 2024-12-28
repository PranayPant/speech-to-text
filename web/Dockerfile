# Use the official Nginx image as the base image
FROM nginx:alpine

COPY ./app /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]