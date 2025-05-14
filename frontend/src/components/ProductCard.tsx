import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import React from "react";
import { motion } from "framer-motion";

interface ProductCardProps {
  title: string;
  description: string;
  icon: string;
  link: string;
  category?: string;
  featured?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  title,
  description,
  icon,
  link,
  category,
  featured,
}) => {
  const renderIcon = () => {
    return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <img
          src={icon}
          alt={title}
          className="w-24 h-24 object-contain mx-auto mb-4"
        />
      </motion.div>
    );
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card
        className={`cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm border border-border/50 hover:border-primary/50 ${
          featured ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => (window.location.href = link)}
      >
        <CardHeader className="flex items-center justify-center pb-2">
          {renderIcon()}
          {category && (
            <span className="text-xs font-medium text-primary/80 uppercase tracking-wider">
              {category}
            </span>
          )}
        </CardHeader>
        <CardContent className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground mb-2">
            {title}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base text-left">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProductCard;

{
  /* <div className="product-card text-center h-100">
<a href={link} className="text-decoration-none">
  <img src={icon} alt={title} className="product-icon" />
  <h3 className="link-title fw-bold">{title}</h3>
  <p className="product-description">{description}</p>
</a>
</div> */
}
